const { query } = require('../config/db');
const { classScope } = require('../middleware/auth');

const list = (user) => {
  const s = classScope(user, 'p.class_id');
  return query(
    `SELECT p.* FROM v_exam_progress p WHERE ${s.sql} ORDER BY p.exam_date DESC, p.class_label`,
    s.params,
  );
};

const get = async (id) =>
  (await query(
    `SELECT e.exam_id, e.exam_name, e.exam_date, e.is_published, e.class_id,
            CONCAT(c.class_name, '-', c.section) AS class_label, c.academic_year
       FROM exams e JOIN classes c ON c.class_id = e.class_id WHERE e.exam_id = ?`, [id]))[0];

const create = async (d) =>
  (await query('INSERT INTO exams (exam_name, class_id, exam_date) VALUES (?, ?, ?)',
    [d.exam_name, d.class_id, d.exam_date])).insertId;

const update = (id, d) =>
  query('UPDATE exams SET exam_name = ?, class_id = ?, exam_date = ? WHERE exam_id = ?',
    [d.exam_name, d.class_id, d.exam_date, id]);

/** The trg_exams_bu trigger refuses to publish when results are missing or stale. */
const setPublished = (id, publish) =>
  query('UPDATE exams SET is_published = ? WHERE exam_id = ?', [publish ? 1 : 0, id]);

const remove = (id) => query('DELETE FROM exams WHERE exam_id = ?', [id]);

/** Teacher may work on an exam only if they teach some subject in its class. */
const teacherCanAccess = async (teacherId, examId) =>
  (await query(
    `SELECT COUNT(*) AS n FROM exams e JOIN teaching_assignments ta ON ta.class_id = e.class_id
      WHERE e.exam_id = ? AND ta.teacher_id = ?`, [examId, teacherId]))[0].n > 0;

module.exports = { list, get, create, update, setPublished, remove, teacherCanAccess };
