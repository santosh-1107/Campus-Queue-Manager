const pool = require('../config/db');
const { validateServiceCreate } = require('../middleware/validate');

// ADMIN: create a new service/queue
async function createService(req, res) {
  try {
    const { name, description } = req.body;
    const errors = validateServiceCreate({ name });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    const [result] = await pool.query(
      'INSERT INTO services (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, name, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create service' });
  }
}

// PUBLIC: list active services (for the student "pick a queue" screen)
async function listServices(req, res) {
  try {
    const [services] = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM tokens t WHERE t.service_id = s.id AND t.status = 'waiting') AS currentQueueLength
       FROM services s WHERE is_active = TRUE`
    );
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
}

// STAFF/ADMIN: dashboard stats for one service — this powers the analytics view
async function getServiceStats(req, res) {
  try {
    const { serviceId } = req.params;

    const [[today]] = await pool.query(
      `SELECT
         COUNT(*) AS totalToday,
         SUM(status = 'completed') AS completedToday,
         SUM(status = 'skipped') AS noShowsToday,
         SUM(status = 'waiting') AS currentlyWaiting
       FROM tokens WHERE service_id = ? AND DATE(queued_at) = CURDATE()`,
      [serviceId]
    );

    const [[avgWait]] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(SECOND, queued_at, called_at)) AS avgActualWaitSecs
       FROM tokens
       WHERE service_id = ? AND called_at IS NOT NULL AND DATE(queued_at) = CURDATE()`,
      [serviceId]
    );

    const [hourly] = await pool.query(
      `SELECT HOUR(queued_at) AS hour, COUNT(*) AS count
       FROM tokens WHERE service_id = ? AND DATE(queued_at) = CURDATE()
       GROUP BY HOUR(queued_at) ORDER BY hour`,
      [serviceId]
    );

    res.json({
      ...today,
      avgActualWaitSecs: avgWait.avgActualWaitSecs || 0,
      noShowRate: today.totalToday ? (today.noShowsToday / today.totalToday) : 0,
      hourlyBreakdown: hourly
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

module.exports = { createService, listServices, getServiceStats };
