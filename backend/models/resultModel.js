const { query } = require('../config/db');

/** Calls the stored procedure that calculates totals, percentage, grade and PASS/FAIL. */
const generate = async (examId) => {
  const rows = await query('CALL sp_generate_results(?)', [examId]);
  return rows[0][0];
};

const forExam = (examId) =>
  query(
    `SELECT result_id, student_id, admission_no, student_name, roll_no, class_label, total_marks, max_total,
            percentage, grade, status, is_stale, class_rank, generated_at
       FROM v_exam_results WHERE exam_id = ? ORDER BY class_rank, roll_no`,
    [examId],
  );

/** A student's own results - only for exams that have been published. */
const mine = (studentId) =>
  query(
    `SELECT r.exam_id, r.exam_name, e.exam_date, r.class_label, r.total_marks, r.max_total,
            r.percentage, r.grade, r.status, r.class_rank
       FROM v_exam_results r JOIN exams e ON e.exam_id = r.exam_id
      WHERE r.student_id = ? AND e.is_published = 1
      ORDER BY e.exam_date DESC`,
    [studentId],
  );

module.exports = { generate, forExam, mine };
