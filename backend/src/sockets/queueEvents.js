const pool = require('../config/db');

// Handles socket connections and room membership.
// Clients join a room per service (e.g. "service_3") so updates only broadcast
// to people actually watching that queue — keeps things fast even with many
// services running at once.
function initSocketEvents(io) {
  io.on('connection', (socket) => {
    socket.on('watchService', async (serviceId) => {
      socket.join(`service_${serviceId}`);

      try {
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
          'SELECT is_paused FROM services WHERE id = ?',
          [serviceId]
        );

        socket.emit('queueUpdate', { serviceId: Number(serviceId), waiting });
        if (called) {
          socket.emit('tokenCalled', { tokenId: called.id, tokenNumber: called.token_number, token: called });
        }
        if (service) {
          socket.emit('queuePauseChanged', { serviceId: Number(serviceId), paused: Boolean(service.is_paused) });
        }
      } catch (err) {
        console.error('Error sending initial queue state on watchService:', err);
      }
    });

    socket.on('unwatchService', (serviceId) => {
      socket.leave(`service_${serviceId}`);
    });

    socket.on('disconnect', () => {
      // no-op — rooms are cleaned up automatically by socket.io
    });
  });
}

module.exports = initSocketEvents;
