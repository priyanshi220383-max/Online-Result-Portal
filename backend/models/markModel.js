const { query, withTransaction } = require('../config/db');
const { classScope } = require('../middleware/auth');

/** Every (exam, subject) combination the user is allowed to enter marks for. */
const options = (user) =>
  query(
    `SELECT e.exam_id, e.exam_name, e.is_published, e.class_id,
            CONCAT(c.class_name, '-', c.section) AS class_label,
            sub.subject_id, sub.subject_code, sub.subject_name, sub.max_marks
       FROM exams e
       JOIN classes c               ON c.class_id = e.class_id
       JOIN teaching_assignments ta ON ta.class_id = e.class_id
       JOIN subjects sub            ON sub.subject_id = ta.subject_id
      WHERE (? = 'admin' OR ta.teacher_id = ?)
      ORDER BY e.exam_date DESC, c.class_name, c.section, sub.subject_name`,
    [user.role, user.teacherId],
  );

const isAssignedTeacher = async (teacherId, examId, subjectId) =>
  (await query(
    `SELECT COUNT(*) AS n FROM exams e JOIN teaching_assignments ta ON ta.class_id = e.class_id
      WHERE e.exam_id = ? AND ta.subject_id = ? AND ta.teacher_id = ?`,
    [examId, subjectId, teacherId]))[0].n > 0;

const sheet = (examId, subjectId) =>
  query(
    `SELECT st.student_id, st.roll_no, st.admission_no, st.full_name, m.marks_obtained, m.updated_at
       FROM exams e
       JOIN students st ON st.class_id = e.class_id
       LEFT JOIN marks m ON m.exam_id = e.exam_id AND m.student_id = st.student_id AND m.subject_id = ?
      WHERE e.exam_id = ?
      ORDER BY st.roll_no`,
    [subjectId, examId],
  );

/** Saves a whole marks sheet atomically: if ANY row is rejected by the validation
 *  trigger the transaction is rolled back and nothing is stored. */
const saveSheet = (examId, subjectId, entries, userId, HttpError) =>
  withTransaction(async (conn) => {
    let saved = 0;
    for (const e of entries) {
      try {
        await conn.execute('CALL sp_save_mark(?, ?, ?, ?, ?)', [examId, e.student_id, subjectId, e.marks_obtained, userId]);
        saved += 1;
      } catch (err) {
        if (err.sqlState === '45000') throw new HttpError(400, `Student #${e.student_id}: ${err.sqlMessage}`);
        throw err;
      }
    }
    return saved;
  });

const audit = (user, examId) => {
  const s = classScope(user, 'e.class_id');
  return query(
    `SELECT a.audit_id, e.exam_name, st.full_name AS student_name, st.roll_no, sub.subject_code,
            a.action, a.old_marks, a.new_marks, u.username AS changed_by, a.changed_at
       FROM marks_audit a
       JOIN exams e ON e.exam_id = a.exam_id
       LEFT JOIN students st ON st.student_id = a.student_id
       LEFT JOIN subjects sub ON sub.subject_id = a.subject_id
       LEFT JOIN users u ON u.user_id = a.changed_by
      WHERE ${s.sql} AND (? IS NULL OR a.exam_id = ?)
      ORDER BY a.audit_id DESC
      LIMIT 50`,
    [...s.params, examId, examId],
  );
};

module.exports = { options, isAssignedTeacher, sheet, saveSheet, audit };
