const { query } = require('../config/db');
const settingsModel = require('./settingsModel');

/** Builds the complete report card for one student and one exam from MySQL. */
async function build(examId, studentId) {
  const [header] = await query(
    `SELECT st.student_id, st.admission_no, st.full_name, st.date_of_birth, st.roll_no,
            st.guardian_name, CONCAT(c.class_name, '-', c.section) AS class_label, c.academic_year,
            e.exam_id, e.exam_name, e.exam_date, e.is_published
       FROM students st
       JOIN classes c ON c.class_id = st.class_id
       JOIN exams e   ON e.class_id = st.class_id AND e.exam_id = ?
      WHERE st.student_id = ?`,
    [examId, studentId],
  );
  if (!header) return null;

  const [result] = await query(
    `SELECT total_marks, max_total, percentage, grade, status, is_stale, class_rank, generated_at
       FROM v_exam_results WHERE exam_id = ? AND student_id = ?`,
    [examId, studentId],
  );
  if (!result) return { header, result: null };

  const [{ class_size }] = await query('SELECT COUNT(*) AS class_size FROM results WHERE exam_id = ?', [examId]);
  const subjects = await query(
    `SELECT subject_code, subject_name, marks_obtained, max_marks, pass_marks,
            subject_percentage AS percentage, subject_grade AS grade, subject_status AS status
       FROM v_student_marks WHERE exam_id = ? AND student_id = ? ORDER BY subject_name`,
    [examId, studentId],
  );
  const [settings, gradeScale] = await Promise.all([settingsModel.getAll(), settingsModel.grades()]);

  return {
    header,
    result,
    card: {
      school: { name: settings.school_name, address: settings.school_address, principal: settings.principal_name },
      student: {
        student_id: header.student_id, admission_no: header.admission_no, full_name: header.full_name,
        date_of_birth: header.date_of_birth, roll_no: header.roll_no, guardian_name: header.guardian_name,
        class_label: header.class_label, academic_year: header.academic_year,
      },
      exam: { exam_id: header.exam_id, exam_name: header.exam_name, exam_date: header.exam_date, is_published: !!header.is_published },
      subjects,
      result: { ...result, is_stale: !!result.is_stale, class_size },
      rules: { pass_percentage: Number(settings.pass_percentage), require_subject_pass: settings.require_subject_pass === '1' },
      grade_scale: gradeScale,
    },
  };
}

module.exports = { build };
