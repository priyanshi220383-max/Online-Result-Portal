const { query } = require('../config/db');

const findByUsername = async (username) =>
  (await query(
    `SELECT u.user_id, u.username, u.password_hash, u.role, u.is_active,
            t.teacher_id, s.student_id,
            COALESCE(t.full_name, s.full_name, 'Administrator') AS display_name
       FROM users u
       LEFT JOIN teachers t ON t.user_id = u.user_id
       LEFT JOIN students s ON s.user_id = u.user_id
      WHERE u.username = ?`,
    [username],
  ))[0];

const findById = async (userId) =>
  (await query('SELECT user_id, password_hash FROM users WHERE user_id = ?', [userId]))[0];

const create = async (conn, { username, passwordHash, role }) => {
  const rows = await conn.execute(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, role],
  );
  return rows[0].insertId;
};

const updatePassword = (userId, passwordHash, conn) =>
  query('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId], conn);

module.exports = { findByUsername, findById, create, updatePassword };
