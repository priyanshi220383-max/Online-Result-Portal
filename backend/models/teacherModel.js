const { query, withTransaction } = require('../config/db');
const userModel = require('./userModel');

const list = () =>
  query(
    `SELECT t.teacher_id, t.employee_code, t.full_name, t.email, t.department, u.username, u.is_active,
            (SELECT COUNT(*) FROM teaching_assignments ta WHERE ta.teacher_id = t.teacher_id) AS assignments
       FROM teachers t JOIN users u ON u.user_id = t.user_id
      ORDER BY t.full_name`,
  );

/** One transaction: the login account and the teacher row are created together or not at all. */
const create = (d, passwordHash) =>
  withTransaction(async (conn) => {
    const userId = await userModel.create(conn, { username: d.username, passwordHash, role: 'teacher' });
    const [r] = await conn.execute(
      'INSERT INTO teachers (user_id, employee_code, full_name, email, department) VALUES (?, ?, ?, ?, ?)',
      [userId, d.employee_code, d.full_name, d.email, d.department],
    );
    return r.insertId;
  });

const update = (id, d) =>
  query('UPDATE teachers SET employee_code = ?, full_name = ?, email = ?, department = ? WHERE teacher_id = ?',
    [d.employee_code, d.full_name, d.email, d.department, id]);

const setActive = (id, active) =>
  query('UPDATE users u JOIN teachers t ON t.user_id = u.user_id SET u.is_active = ? WHERE t.teacher_id = ?',
    [active ? 1 : 0, id]);

/** Deleting the user cascades to the teacher row; assignments become "unassigned" (ON DELETE SET NULL). */
const remove = (id) =>
  query('DELETE u FROM users u JOIN teachers t ON t.user_id = u.user_id WHERE t.teacher_id = ?', [id]);

module.exports = { list, create, update, setActive, remove };
