const { query } = require('../config/db');
const { classScope } = require('../middleware/auth');

const list = (user) => {
  const s = classScope(user, 'c.class_id');
  return query(
    `SELECT c.class_id, c.class_name, c.section, c.academic_year,
            CONCAT(c.class_name, '-', c.section) AS class_label,
            (SELECT COUNT(*) FROM students st WHERE st.class_id = c.class_id) AS student_count,
            (SELECT COUNT(*) FROM teaching_assignments ta WHERE ta.class_id = c.class_id) AS subject_count
       FROM classes c
      WHERE ${s.sql}
      ORDER BY c.academic_year DESC, c.class_name, c.section`,
    s.params,
  );
};

const create = async (d) =>
  (await query('INSERT INTO classes (class_name, section, academic_year) VALUES (?, ?, ?)',
    [d.class_name, d.section, d.academic_year])).insertId;

const update = (id, d) =>
  query('UPDATE classes SET class_name = ?, section = ?, academic_year = ? WHERE class_id = ?',
    [d.class_name, d.section, d.academic_year, id]);

const remove = (id) => query('DELETE FROM classes WHERE class_id = ?', [id]);

const assignments = (classId) =>
  query(
    `SELECT ta.assignment_id, ta.subject_id, sub.subject_code, sub.subject_name, sub.max_marks,
            ta.teacher_id, t.full_name AS teacher_name
       FROM teaching_assignments ta
       JOIN subjects sub ON sub.subject_id = ta.subject_id
       LEFT JOIN teachers t ON t.teacher_id = ta.teacher_id
      WHERE ta.class_id = ?
      ORDER BY sub.subject_name`,
    [classId],
  );

const assign = (classId, subjectId, teacherId) =>
  query(
    `INSERT INTO teaching_assignments (class_id, subject_id, teacher_id) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE teacher_id = ?`,
    [classId, subjectId, teacherId, teacherId],
  );

const hasMarks = async (classId, subjectId) =>
  (await query(
    `SELECT COUNT(*) AS n FROM marks m JOIN exams e ON e.exam_id = m.exam_id
      WHERE e.class_id = ? AND m.subject_id = ?`, [classId, subjectId]))[0].n > 0;

const unassign = (classId, subjectId) =>
  query('DELETE FROM teaching_assignments WHERE class_id = ? AND subject_id = ?', [classId, subjectId]);

module.exports = { list, create, update, remove, assignments, assign, hasMarks, unassign };
