const { query, withTransaction } = require('../config/db');
const userModel = require('./userModel');
const { classScope } = require('../middleware/auth');

const COLUMNS = `s.student_id, s.admission_no, s.full_name, s.date_of_birth, s.gender, s.class_id,
       CONCAT(c.class_name, '-', c.section) AS class_label, c.academic_year, s.roll_no,
       s.guardian_name, s.guardian_phone, s.email, (s.user_id IS NOT NULL) AS has_login`;

const list = ({ search, classId }, user) => {
  const s = classScope(user, 's.class_id');
  const like = search ? `%${search}%` : null;
  return query(
    `SELECT ${COLUMNS}
       FROM students s JOIN classes c ON c.class_id = s.class_id
      WHERE ${s.sql}
        AND (? IS NULL OR s.class_id = ?)
        AND (? IS NULL OR s.full_name LIKE ? OR s.admission_no LIKE ?)
      ORDER BY c.class_name, c.section, s.roll_no`,
    [...s.params, classId, classId, like, like, like],
  );
};

const get = async (id) =>
  (await query(`SELECT ${COLUMNS} FROM students s JOIN classes c ON c.class_id = s.class_id WHERE s.student_id = ?`, [id]))[0];

/** Student row + optional login account, created in ONE transaction. */
const create = (d, passwordHash) =>
  withTransaction(async (conn) => {
    let userId = null;
    if (passwordHash) userId = await userModel.create(conn, { username: d.admission_no, passwordHash, role: 'student' });
    const [r] = await conn.execute(
      `INSERT INTO students (user_id, admission_no, full_name, date_of_birth, gender, class_id, roll_no,
                             guardian_name, guardian_phone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, d.admission_no, d.full_name, d.date_of_birth, d.gender, d.class_id, d.roll_no,
        d.guardian_name, d.guardian_phone, d.email],
    );
    return r.insertId;
  });

const update = (id, d, passwordHash) =>
  withTransaction(async (conn) => {
    const [[existing]] = await conn.execute('SELECT user_id FROM students WHERE student_id = ?', [id]);
    if (!existing) return false;
    await conn.execute(
      `UPDATE students SET admission_no = ?, full_name = ?, date_of_birth = ?, gender = ?, class_id = ?,
              roll_no = ?, guardian_name = ?, guardian_phone = ?, email = ? WHERE student_id = ?`,
      [d.admission_no, d.full_name, d.date_of_birth, d.gender, d.class_id, d.roll_no,
        d.guardian_name, d.guardian_phone, d.email, id],
    );
    if (existing.user_id) {
      await conn.execute('UPDATE users SET username = ? WHERE user_id = ?', [d.admission_no, existing.user_id]);
      if (passwordHash) await userModel.updatePassword(existing.user_id, passwordHash, conn);
    } else if (passwordHash) {
      const userId = await userModel.create(conn, { username: d.admission_no, passwordHash, role: 'student' });
      await conn.execute('UPDATE students SET user_id = ? WHERE student_id = ?', [userId, id]);
    }
    return true;
  });

/** Removes the student (marks/results cascade) and their login account. */
const remove = (id) =>
  withTransaction(async (conn) => {
    const [[row]] = await conn.execute('SELECT user_id FROM students WHERE student_id = ?', [id]);
    if (!row) return false;
    await conn.execute('DELETE FROM students WHERE student_id = ?', [id]);
    if (row.user_id) await conn.execute('DELETE FROM users WHERE user_id = ?', [row.user_id]);
    return true;
  });

module.exports = { list, get, create, update, remove };
