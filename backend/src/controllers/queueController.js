const pool = require('../config/db');
const { estimateWaitSeconds, updateAverageServiceTime } = require('../services/waitTimePredictor');
const { validateJoinQueue } = require('../middleware/validate');

// Socket.io instance gets attached in app.js so controllers can emit events.
let io;
function attachIo(socketIoInstance) {
  io = socketIoInstance;
}

async function broadcastQueueUpdate(serviceId) {
  if (!io) return;
  const [waiting] = await pool.query(
    `SELECT t.id, t.token_number, t.user_id, u.name, t.queued_at
     FROM tokens t JOIN users u ON u.id = t.user_id
     WHERE t.service_id = ? AND t.status = 'waiting'
     ORDER BY t.queued_at ASC`,
    [serviceId]
  );
  io.to(`service_${serviceId}`).emit('queueUpdate', { serviceId, waiting });
}

// STUDENT: join a queue for a service
async function joinQueue(req, res) {
  const conn = await pool.getConnection();
  try {
    const { serviceId } = req.body;
    const userId = req.user.id;

    const inputErrors = validateJoinQueue({ serviceId });
    if (inputErrors.length > 0) {
      conn.release();
      return res.status(400).json({ error: inputErrors.join('; ') });
    }

    const [[service]] = await conn.query(
      'SELECT * FROM services WHERE id = ? AND is_active = TRUE FOR UPDATE',
      [serviceId]
    );
    if (!service) {
      conn.release();
      return res.status(404).json({ error: 'Service not found or inactive' });
    }
    if (service.is_paused) {
      conn.release();
      return res.status(400).json({ error: 'This queue is currently paused' });
    }

    // Prevent a user from holding two active tokens in the same queue
    const [[existing]] = await conn.query(
      `SELECT id FROM tokens WHERE service_id = ? AND user_id = ?
       AND status IN ('waiting', 'called', 'serving')`,
      [serviceId, userId]
    );
    if (existing) {
      conn.release();
      return res.status(409).json({ error: 'You already have an active token for this queue' });
    }

    await conn.beginTransaction();

    // Next token number for today, per service — FOR UPDATE locks the row set
    // so two simultaneous joins can never get the same number.
    const [[{ maxToken }]] = await conn.query(
      `SELECT COALESCE(MAX(token_number), 0) AS maxToken FROM tokens
       WHERE service_id = ? AND DATE(queued_at) = CURDATE() FOR UPDATE`,
      [serviceId]
    );
    const tokenNumber = maxToken + 1;

    const [result] = await conn.query(
      'INSERT INTO tokens (service_id, user_id, token_number, status) VALUES (?, ?, ?, ?)',
      [serviceId, userId, tokenNumber, 'waiting']
    );

    await conn.commit();
    conn.release();

    const estimate = await estimateWaitSeconds(serviceId, result.insertId);
    await broadcastQueueUpdate(serviceId);

    res.status(201).json({
      tokenId: result.insertId,
      tokenNumber,
      ...estimate
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Failed to join queue' });
  }
}

// STUDENT: check live position + estimated wait for their own token
async function getMyTokenStatus(req, res) {
  try {
    const { tokenId } = req.params;
    const [[token]] = await pool.query('SELECT * FROM tokens WHERE id = ? AND user_id = ?', [
      tokenId,
      req.user.id
    ]);
    if (!token) return res.status(404).json({ error: 'Token not found' });

    if (token.status !== 'waiting') {
      return res.json({ token, peopleAhead: 0, estimatedSeconds: 0 });
    }
    const estimate = await estimateWaitSeconds(token.service_id, token.id);
    res.json({ token, ...estimate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch token status' });
  }
}

// STUDENT: cancel own token
async function cancelToken(req, res) {
  try {
    const { tokenId } = req.params;
    const [[token]] = await pool.query(
      "SELECT * FROM tokens WHERE id = ? AND user_id = ? AND status = 'waiting'",
      [tokenId, req.user.id]
    );
    if (!token) return res.status(404).json({ error: 'No active waiting token found' });

    await pool.query("UPDATE tokens SET status = 'cancelled' WHERE id = ?", [tokenId]);
    await broadcastQueueUpdate(token.service_id);
    res.json({ message: 'Token cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel token' });
  }
}

// STAFF: call the next waiting token
async function callNext(req, res) {
  const conn = await pool.getConnection();
  try {
    const { serviceId } = req.params;
    await conn.beginTransaction();

    const [[next]] = await conn.query(
      `SELECT * FROM tokens WHERE service_id = ? AND status = 'waiting'
       ORDER BY queued_at ASC LIMIT 1 FOR UPDATE`,
      [serviceId]
    );
    if (!next) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'No one is waiting' });
    }

    await conn.query("UPDATE tokens SET status = 'called', called_at = NOW() WHERE id = ?", [
      next.id
    ]);
    await conn.commit();
    conn.release();

    if (io) io.to(`service_${serviceId}`).emit('tokenCalled', { tokenId: next.id, tokenNumber: next.token_number });
    await broadcastQueueUpdate(serviceId);
    res.json({ message: 'Next token called', token: next });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Failed to call next token' });
  }
}

// STAFF: mark a called token as completed, and feed the duration back into the predictor
async function completeToken(req, res) {
  try {
    const { tokenId } = req.params;
    const [[token]] = await pool.query("SELECT * FROM tokens WHERE id = ? AND status IN ('called','serving')", [
      tokenId
    ]);
    if (!token) return res.status(404).json({ error: 'Active token not found' });

    await pool.query("UPDATE tokens SET status = 'completed', completed_at = NOW() WHERE id = ?", [
      tokenId
    ]);

    if (token.called_at) {
      const durationSecs = Math.round((Date.now() - new Date(token.called_at).getTime()) / 1000);
      await updateAverageServiceTime(token.service_id, durationSecs);
    }

    if (io) {
      io.to(`service_${token.service_id}`).emit('tokenCompleted', { tokenId: token.id });
    }
    await broadcastQueueUpdate(token.service_id);
    res.json({ message: 'Token completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete token' });
  }
}

// PUBLIC/STAFF: get live queue state for a service (waiting list + current called token + pause state)
async function getQueueState(req, res) {
  try {
    const { serviceId } = req.params;
    const [waiting] = await pool.query(
      `SELECT t.id, t.token_number, t.user_id, u.name, t.queued_at
       FROM tokens t JOIN users u ON u.id = t.user_id
       WHERE t.service_id = ? AND t.status = 'waiting'
       ORDER BY t.queued_at ASC`,
      [serviceId]
    );
    const [[called]] = await pool.query(
      `SELECT t.id, t.token_number, t.user_id, u.name, t.called_at, t.status
       FROM tokens t JOIN users u ON u.id = t.user_id
       WHERE t.service_id = ? AND t.status IN ('called', 'serving')
       ORDER BY t.called_at DESC LIMIT 1`,
      [serviceId]
    );
    const [[service]] = await pool.query(
      'SELECT id, name, is_paused FROM services WHERE id = ?',
      [serviceId]
    );

    res.json({
      serviceId: Number(serviceId),
      service: service || null,
      waiting,
      calledToken: called || null,
      paused: Boolean(service?.is_paused)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue state' });
  }
}

// SYSTEM/STAFF: auto-skip a called token that was never claimed within the grace window.
// Wire this up to a setInterval in server.js, or trigger manually from the staff panel.
async function autoSkipNoShows() {
  try {
    const graceSeconds = parseInt(process.env.NO_SHOW_GRACE_SECONDS || '120', 10);
    const [staleTokens] = await pool.query(
      `SELECT * FROM tokens WHERE status = 'called'
       AND called_at < (NOW() - INTERVAL ? SECOND)`,
      [graceSeconds]
    );
    for (const token of staleTokens) {
      await pool.query("UPDATE tokens SET status = 'skipped' WHERE id = ?", [token.id]);
      if (io) io.to(`service_${token.service_id}`).emit('tokenSkipped', { tokenId: token.id });
      await broadcastQueueUpdate(token.service_id);
    }
  } catch (err) {
    console.error('autoSkipNoShows failed:', err);
  }
}

// STAFF: pause/resume a queue
async function toggleQueuePause(req, res) {
  try {
    const { serviceId } = req.params;
    const { paused } = req.body;
    await pool.query('UPDATE services SET is_paused = ? WHERE id = ?', [!!paused, serviceId]);
    if (io) io.to(`service_${serviceId}`).emit('queuePauseChanged', { serviceId: Number(serviceId), paused: !!paused });
    res.json({ message: `Queue ${paused ? 'paused' : 'resumed'}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update queue state' });
  }
}

module.exports = {
  attachIo,
  joinQueue,
  getMyTokenStatus,
  cancelToken,
  callNext,
  completeToken,
  autoSkipNoShows,
  toggleQueuePause,
  getQueueState
};
