const pool = require('../config/db');

/**
 * Estimates wait time for a token based on:
 *  1. How many people are ahead of it in the "waiting" state
 *  2. The service's rolling average handling time (avg_service_time_secs)
 *
 * This is intentionally a simple, explainable heuristic rather than a full ML
 * model — it's fast to compute, easy to justify to judges, and accurate enough
 * for a 2-day build. avg_service_time_secs updates itself over time (see
 * updateAverageServiceTime) so the estimate improves as the queue runs.
 */
async function estimateWaitSeconds(serviceId, tokenId) {
  const [[service]] = await pool.query(
    'SELECT avg_service_time_secs FROM services WHERE id = ?',
    [serviceId]
  );
  if (!service) return null;

  const [[{ position }]] = await pool.query(
    `SELECT COUNT(*) AS position
     FROM tokens
     WHERE service_id = ?
       AND status = 'waiting'
       AND queued_at <= (SELECT queued_at FROM tokens WHERE id = ?)`,
    [serviceId, tokenId]
  );

  // position includes the token itself, so people strictly ahead = position - 1
  const peopleAhead = Math.max(position - 1, 0);
  const estimatedSeconds = peopleAhead * service.avg_service_time_secs;

  return { peopleAhead, estimatedSeconds };
}

/**
 * Call this whenever a token is marked 'completed' to keep the average fresh.
 * Uses a simple exponential moving average so recent service times matter
 * more than old ones (counters get faster/slower over the day).
 */
async function updateAverageServiceTime(serviceId, actualDurationSecs) {
  const ALPHA = 0.3; // weight given to the newest observation
  const [[service]] = await pool.query(
    'SELECT avg_service_time_secs FROM services WHERE id = ?',
    [serviceId]
  );
  if (!service) return;

  const newAvg = Math.round(
    ALPHA * actualDurationSecs + (1 - ALPHA) * service.avg_service_time_secs
  );

  await pool.query('UPDATE services SET avg_service_time_secs = ? WHERE id = ?', [
    newAvg,
    serviceId
  ]);
}

module.exports = { estimateWaitSeconds, updateAverageServiceTime };
