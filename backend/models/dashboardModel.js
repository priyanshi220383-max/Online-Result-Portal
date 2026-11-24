const { query } = require('../config/db');
const { classScope } = require('../middleware/auth');

async function summary(user) {
  const sc = classScope(user, 'c.class_id');
  const se = classScope(user, 'e.class_id');
  const sp = classScope(user, 'p.class_id');
  const sr = classScope(user, 'r.class_id');

  const [counts] = await query(
    `SELECT (SELECT COUNT(*) FROM students st JOIN classes c ON c.class_id = st.class_id WHERE ${sc.sql}) AS students,
            (SELECT COUNT(*) FROM classes c WHERE ${sc.sql}) AS classes,
            (SELECT COUNT(*) FROM subjects) AS subjects,
            (SELECT COUNT(*) FROM teachers) AS teachers,
            (SELECT COUNT(*) FROM exams e WHERE ${se.sql}) AS exams,
            (SELECT COUNT(*) FROM exams e WHERE ${se.sql} AND e.is_published = 1) AS published_exams`,
    [...sc.params, ...sc.params, ...se.params, ...se.params],
  );

  const [stats] = await query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(r.status = 'PASS'), 0) AS passed,
            COALESCE(SUM(r.status = 'FAIL'), 0) AS failed, ROUND(AVG(r.percentage), 2) AS average_percentage
       FROM v_exam_results r WHERE ${sr.sql}`,
    sr.params,
  );

  const gradeDistribution = await query(
    `SELECT g.grade, COUNT(r.result_id) AS count
       FROM grade_scale g
       LEFT JOIN v_exam_results r ON r.grade = g.grade AND ${sr.sql}
      GROUP BY g.grade, g.min_percentage ORDER BY g.min_percentage DESC`,
    sr.params,
  );

  // Window function: rank 1 of each exam = the topper(s)
  const toppers = await query(
    `SELECT r.exam_name, r.class_label, r.student_name, r.percentage, r.grade
       FROM v_exam_results r WHERE r.class_rank = 1 AND ${sr.sql}
      ORDER BY r.percentage DESC LIMIT 5`,
    sr.params,
  );

  const subjectPerformance = await query(
    `SELECT sub.subject_code, sub.subject_name,
            ROUND(AVG(m.marks_obtained / sub.max_marks * 100), 1) AS average_percentage
       FROM marks m
       JOIN subjects sub ON sub.subject_id = m.subject_id
       JOIN exams e ON e.exam_id = m.exam_id
      WHERE ${se.sql}
      GROUP BY sub.subject_id, sub.subject_code, sub.subject_name
      ORDER BY sub.subject_name`,
    se.params,
  );

  const exams = await query(
    `SELECT p.exam_id, p.exam_name, p.exam_date, p.class_label, p.is_published, p.total_students,
            p.total_subjects, p.marks_entered, p.results_generated, p.results_stale, p.passed
       FROM v_exam_progress p WHERE ${sp.sql} ORDER BY p.exam_date DESC, p.class_label LIMIT 8`,
    sp.params,
  );

  return {
    counts,
    results: { ...stats, pass_rate: stats.total ? Math.round((stats.passed / stats.total) * 1000) / 10 : 0 },
    gradeDistribution,
    toppers,
    subjectPerformance,
    exams,
  };
}

module.exports = { summary };
