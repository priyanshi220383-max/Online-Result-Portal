-- ============================================================================
--  views.sql  -  VIEWS (MySQL 8.0)                                    UNIT 2
--  Run AFTER schema.sql and procedures.sql (views call fn_grade).
-- ============================================================================
USE result_portal;

-- Every mark with student, subject, exam and class details (multi-table JOIN).
CREATE OR REPLACE VIEW v_student_marks AS
SELECT m.exam_id,
       e.exam_name,
       st.student_id,
       st.admission_no,
       st.full_name                         AS student_name,
       st.class_id,
       CONCAT(c.class_name, '-', c.section) AS class_label,
       sub.subject_id,
       sub.subject_code,
       sub.subject_name,
       m.marks_obtained,
       sub.max_marks,
       sub.pass_marks,
       fn_percentage(m.marks_obtained, sub.max_marks) AS subject_percentage,
       fn_grade(fn_percentage(m.marks_obtained, sub.max_marks)) AS subject_grade,
       IF(m.marks_obtained >= sub.pass_marks, 'PASS', 'FAIL')   AS subject_status
  FROM marks m
  JOIN exams    e   ON e.exam_id     = m.exam_id
  JOIN students st  ON st.student_id = m.student_id
  JOIN classes  c   ON c.class_id    = st.class_id
  JOIN subjects sub ON sub.subject_id = m.subject_id;

-- Results with class rank. RANK() is a WINDOW FUNCTION partitioned by exam.
CREATE OR REPLACE VIEW v_exam_results AS
SELECT r.result_id,
       r.exam_id,
       e.exam_name,
       r.student_id,
       st.admission_no,
       st.full_name                         AS student_name,
       st.roll_no,
       st.class_id,
       CONCAT(c.class_name, '-', c.section) AS class_label,
       r.total_marks,
       r.max_total,
       r.percentage,
       r.grade,
       r.status,
       r.is_stale,
       r.generated_at,
       RANK() OVER (PARTITION BY r.exam_id ORDER BY r.percentage DESC) AS class_rank
  FROM results r
  JOIN exams    e  ON e.exam_id    = r.exam_id
  JOIN students st ON st.student_id = r.student_id
  JOIN classes  c  ON c.class_id   = st.class_id;

-- Subject-wise statistics per exam (GROUP BY + aggregates).
CREATE OR REPLACE VIEW v_subject_stats AS
SELECT m.exam_id,
       e.exam_name,
       sub.subject_id,
       sub.subject_code,
       sub.subject_name,
       sub.max_marks,
       COUNT(*)                                   AS students_appeared,
       ROUND(AVG(m.marks_obtained), 2)            AS average_marks,
       MAX(m.marks_obtained)                      AS highest_marks,
       MIN(m.marks_obtained)                      AS lowest_marks,
       SUM(m.marks_obtained >= sub.pass_marks)    AS students_passed
  FROM marks m
  JOIN exams    e   ON e.exam_id = m.exam_id
  JOIN subjects sub ON sub.subject_id = m.subject_id
 GROUP BY m.exam_id, e.exam_name, sub.subject_id, sub.subject_code, sub.subject_name, sub.max_marks;

-- Progress of every exam: how many marks are entered, how many results exist.
CREATE OR REPLACE VIEW v_exam_progress AS
SELECT e.exam_id,
       e.exam_name,
       e.exam_date,
       e.is_published,
       e.class_id,
       CONCAT(c.class_name, '-', c.section) AS class_label,
       c.academic_year,
       (SELECT COUNT(*) FROM students s WHERE s.class_id = e.class_id)           AS total_students,
       (SELECT COUNT(*) FROM teaching_assignments ta WHERE ta.class_id = e.class_id) AS total_subjects,
       (SELECT COUNT(*) FROM marks m WHERE m.exam_id = e.exam_id)                AS marks_entered,
       (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.exam_id)              AS results_generated,
       (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.exam_id AND r.is_stale = 1) AS results_stale,
       (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.exam_id AND r.status = 'PASS') AS passed
  FROM exams e
  JOIN classes c ON c.class_id = e.class_id;
