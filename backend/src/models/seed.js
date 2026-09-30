/**
 * Seeds the database with enough sample data for a live demo:
 * - 3 services (certificate counter, help desk, lab equipment)
 * - 1 admin, 2 staff (one per busier service), 6 students
 * - A handful of tokens already in the queue so the board isn't empty
 *   when you walk up to demo it
 *
 * Run with: npm run seed
 * Safe to re-run — it clears existing demo rows first (matched by email
 * domain @demo.cqm) rather than truncating the whole DB.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('Clearing previous demo data...');
    await conn.query(`DELETE FROM tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@demo.cqm')`);
    await conn.query(`DELETE FROM staff_service WHERE staff_id IN (SELECT id FROM users WHERE email LIKE '%@demo.cqm')`);
    await conn.query(`DELETE FROM services WHERE name IN ('Certificate Counter', 'Help Desk', 'Lab Equipment Booking')`);
    await conn.query(`DELETE FROM users WHERE email LIKE '%@demo.cqm'`);

    const passwordHash = await bcrypt.hash('demo1234', 10);

    console.log('Creating users...');
    const [admin] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`,
      ['Admin Demo', 'admin@demo.cqm', passwordHash]
    );
    const [staff1] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'staff')`,
      ['Priya (Staff)', 'staff1@demo.cqm', passwordHash]
    );
    const [staff2] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'staff')`,
      ['Arjun (Staff)', 'staff2@demo.cqm', passwordHash]
    );

    const studentNames = ['Aditi', 'Rohan', 'Meera', 'Kabir', 'Sana', 'Vikram'];
    const studentIds = [];
    for (const name of studentNames) {
      const [res] = await conn.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')`,
        [name, `${name.toLowerCase()}@demo.cqm`, passwordHash]
      );
      studentIds.push(res.insertId);
    }

    console.log('Creating services...');
    const [certService] = await conn.query(
      `INSERT INTO services (name, description, created_by, avg_service_time_secs) VALUES (?, ?, ?, ?)`,
      ['Certificate Counter', 'Bonafide, transcripts, and other certificate requests', admin.insertId, 150]
    );
    const [helpDeskService] = await conn.query(
      `INSERT INTO services (name, description, created_by, avg_service_time_secs) VALUES (?, ?, ?, ?)`,
      ['Help Desk', 'General student queries and admin support', admin.insertId, 200]
    );
    const [labService] = await conn.query(
      `INSERT INTO services (name, description, created_by, avg_service_time_secs) VALUES (?, ?, ?, ?)`,
      ['Lab Equipment Booking', 'Checkout for shared lab devices', admin.insertId, 90]
    );

    await conn.query(`INSERT INTO staff_service (staff_id, service_id) VALUES (?, ?), (?, ?)`, [
      staff1.insertId, certService.insertId,
      staff2.insertId, helpDeskService.insertId
    ]);

    console.log('Joining students to queues...');
    // Certificate Counter: 3 students waiting, staggered join times so the
    // board shows a realistic-looking queue rather than everyone at once
    for (let i = 0; i < 3; i++) {
      await conn.query(
        `INSERT INTO tokens (service_id, user_id, token_number, status, queued_at)
         VALUES (?, ?, ?, 'waiting', NOW() - INTERVAL ? MINUTE)`,
        [certService.insertId, studentIds[i], i + 1, (3 - i) * 2]
      );
    }
    // Help Desk: 2 waiting
    for (let i = 0; i < 2; i++) {
      await conn.query(
        `INSERT INTO tokens (service_id, user_id, token_number, status, queued_at)
         VALUES (?, ?, ?, 'waiting', NOW() - INTERVAL ? MINUTE)`,
        [helpDeskService.insertId, studentIds[3 + i], i + 1, (2 - i) * 3]
      );
    }
    // Lab Equipment: empty queue, but with a couple of completed tokens
    // earlier today so the admin stats/chart aren't blank
    await conn.query(
      `INSERT INTO tokens (service_id, user_id, token_number, status, queued_at, called_at, completed_at)
       VALUES (?, ?, 1, 'completed', NOW() - INTERVAL 90 MINUTE, NOW() - INTERVAL 88 MINUTE, NOW() - INTERVAL 86 MINUTE)`,
      [labService.insertId, studentIds[5]]
    );
    await conn.query(
      `INSERT INTO tokens (service_id, user_id, token_number, status, queued_at, called_at)
       VALUES (?, ?, 2, 'skipped', NOW() - INTERVAL 40 MINUTE, NOW() - INTERVAL 35 MINUTE)`,
      [labService.insertId, studentIds[4]]
    );

    console.log('\nSeed complete. Demo logins (all passwords: demo1234):');
    console.log('  admin@demo.cqm   — admin');
    console.log('  staff1@demo.cqm  — staff, watches Certificate Counter');
    console.log('  staff2@demo.cqm  — staff, watches Help Desk');
    console.log('  aditi@demo.cqm / rohan@demo.cqm / meera@demo.cqm ... — students, some already in queue');
    console.log(`\nService IDs — Certificate Counter: ${certService.insertId}, Help Desk: ${helpDeskService.insertId}, Lab Equipment: ${labService.insertId}`);
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
