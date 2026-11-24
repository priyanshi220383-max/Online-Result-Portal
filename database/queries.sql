-- ============================================================================
--  queries.sql  -  organised, executable SQL examples (MySQL 8.0)
--  Uses the real sample data from seed.sql.  Run the whole file with:
--      mysql -u root -p result_portal < database/queries.sql
--  or copy one section at a time into MySQL Workbench.
--  Sections that change data run inside a transaction that is rolled back, so
--  the sample data stays unchanged.
--
--  1. DDL                      5. Subqueries            9.  Transactions (TCL)
--  2. DML                      6. Set operations        10. Procedures, functions, triggers
--  3. Joins (inner/outer/self) 7. Views                 11. Security (DCL)
--  4. Aggregation / GROUP BY   8. Window functions, CTEs 12. Indexing & EXPLAIN (Unit 4)
-- ============================================================================
USE result_portal;

-- ============================================================================
-- 1. DDL  (CREATE / ALTER / TRUNCATE / DROP) - on a scratch table
-- ============================================================================
DROP TABLE IF EXISTS demo_notice;
CREATE TABLE demo_notice (
  notice_id INT AUTO_INCREMENT PRIMARY KEY,
  title     VARCHAR(100) NOT NULL,
  posted_on DATE NOT NULL DEFAULT (CURRENT_DATE)
);
ALTER TABLE demo_notice ADD COLUMN audience ENUM('all','students','teachers') NOT NULL DEFAULT 'all';
ALTER TABLE demo_notice ADD INDEX idx_notice_date (posted_on);
-- (DML on it)
INSERT INTO demo_notice (title, audience) VALUES ('Half-yearly results published', 'students'),
                                                 ('Marks entry deadline', 'teachers');
UPDATE demo_notice SET title = 'Marks entry deadline: Friday' WHERE audience = 'teachers';
DELETE FROM demo_notice WHERE audience = 'students';
SELECT * FROM demo_notice;
TRUNCATE TABLE demo_notice;
DROP TABLE demo_notice;

-- ============================================================================
-- 2. DML on real tables (inside a transaction, rolled back at the end)
-- ============================================================================
START TRANSACTION;
INSERT INTO classes (class_name, section, academic_year) VALUES ('8', 'A', '2025-26');
UPDATE subjects SET subject_name = 'Computer Science (Practical)' WHERE subject_code = 'CSC';
SELECT class_name, section FROM classes WHERE class_name = '8';
SELECT subject_code, subject_name FROM subjects WHERE subject_code = 'CSC';
DELETE FROM classes WHERE class_name = '8';
ROLLBACK;

-- ============================================================================
-- 3. JOINS
-- ============================================================================
-- 3.1 INNER JOIN: marks of one student with subject names
SELECT st.full_name, sub.subject_name, m.marks_obtained, sub.max_marks
  FROM marks m
  INNER JOIN students st ON st.student_id = m.student_id
  INNER JOIN subjects sub ON sub.subject_id = m.subject_id
  INNER JOIN exams e ON e.exam_id = m.exam_id
 WHERE st.admission_no = 'ADM2025001' AND e.exam_name = 'Unit Test 1';

-- 3.2 LEFT OUTER JOIN: every student of 10-B and how many Half-Yearly marks are entered (0 = none yet)
SELECT st.roll_no, st.full_name, COUNT(m.mark_id) AS half_yearly_marks_entered
  FROM students st
  JOIN classes c ON c.class_id = st.class_id AND c.class_name = '10' AND c.section = 'B'
  LEFT JOIN exams e ON e.class_id = st.class_id AND e.exam_name = 'Half-Yearly Examination'
  LEFT JOIN marks m ON m.exam_id = e.exam_id AND m.student_id = st.student_id
 GROUP BY st.student_id, st.roll_no, st.full_name
 ORDER BY st.roll_no;

-- 3.3 RIGHT OUTER JOIN: subjects and the classes they are used in (subjects without class would show NULL)
SELECT sub.subject_name, c.class_name, c.section
  FROM classes c
  RIGHT JOIN teaching_assignments ta ON ta.class_id = c.class_id
  RIGHT JOIN subjects sub ON sub.subject_id = ta.subject_id
 ORDER BY sub.subject_name, c.class_name, c.section;

-- 3.4 FULL OUTER JOIN (MySQL has none: LEFT JOIN UNION RIGHT JOIN) - teachers vs. their assignments
SELECT t.full_name AS teacher, ta.assignment_id FROM teachers t LEFT JOIN teaching_assignments ta ON ta.teacher_id = t.teacher_id
UNION
SELECT t.full_name, ta.assignment_id FROM teachers t RIGHT JOIN teaching_assignments ta ON ta.teacher_id = t.teacher_id;

-- 3.5 SELF JOIN: pairs of students in the same class with the same guardian surname initial (classmates pairing)
SELECT a.full_name AS student_a, b.full_name AS student_b, CONCAT(c.class_name, '-', c.section) AS class
  FROM students a
  JOIN students b ON a.class_id = b.class_id AND a.student_id < b.student_id
  JOIN classes c ON c.class_id = a.class_id
 WHERE a.roll_no + 1 = b.roll_no AND c.class_name = '10' AND c.section = 'A';   -- consecutive roll numbers = seating pairs

-- 3.6 CROSS JOIN: the full "marks-entry checklist" every class must complete
SELECT CONCAT(c.class_name, '-', c.section) AS class, sub.subject_code
  FROM classes c CROSS JOIN subjects sub
 WHERE c.class_name = '9';

-- ============================================================================
-- 4. AGGREGATION, GROUP BY, HAVING
-- ============================================================================
SELECT sub.subject_name, COUNT(*) AS students, ROUND(AVG(m.marks_obtained), 2) AS average, MAX(m.marks_obtained) AS highest, MIN(m.marks_obtained) AS lowest
  FROM marks m JOIN subjects sub ON sub.subject_id = m.subject_id JOIN exams e ON e.exam_id = m.exam_id
 WHERE e.exam_name = 'Unit Test 1'
 GROUP BY sub.subject_id, sub.subject_name
HAVING AVG(m.marks_obtained / sub.max_marks) > 0.5
 ORDER BY average DESC;

-- Grade distribution for each exam
SELECT exam_name, class_label, grade, COUNT(*) AS students
  FROM v_exam_results GROUP BY exam_id, exam_name, class_label, grade ORDER BY exam_id, grade;

-- ============================================================================
-- 5. SUBQUERIES
-- ============================================================================
-- 5.1 scalar subquery: students scoring above the average percentage of their exam
SELECT student_name, class_label, percentage
  FROM v_exam_results r
 WHERE exam_name = 'Unit Test 1'
   AND percentage > (SELECT AVG(percentage) FROM results WHERE exam_id = r.exam_id)   -- correlated
 ORDER BY percentage DESC;

-- 5.2 IN subquery: students who failed at least one subject in any exam
SELECT full_name FROM students
 WHERE student_id IN (SELECT student_id FROM v_student_marks WHERE subject_status = 'FAIL');

-- 5.3 NOT EXISTS: students with NO result yet in the Half-Yearly of their class
SELECT st.full_name, CONCAT(c.class_name, '-', c.section) AS class
  FROM students st JOIN classes c ON c.class_id = st.class_id
 WHERE c.class_name = '10'
   AND NOT EXISTS (SELECT 1 FROM results r JOIN exams e ON e.exam_id = r.exam_id
                    WHERE r.student_id = st.student_id AND e.exam_name = 'Half-Yearly Examination');

-- 5.4 derived table: class-wise average of the exam averages
SELECT class_label, ROUND(AVG(avg_pct), 2) AS mean_of_exam_averages
  FROM (SELECT class_label, exam_id, AVG(percentage) AS avg_pct FROM v_exam_results GROUP BY class_label, exam_id) t
 GROUP BY class_label;

-- ============================================================================
-- 6. SET OPERATIONS  (INTERSECT / EXCEPT need MySQL 8.0.31+)
-- ============================================================================
-- UNION: every student who has either failed a subject in UT1 or has a FAIL result
SELECT student_id FROM v_student_marks WHERE exam_name = 'Unit Test 1' AND subject_status = 'FAIL'
UNION
SELECT student_id FROM results WHERE status = 'FAIL';

-- INTERSECT: students with results in BOTH exams
SELECT student_id FROM results WHERE exam_id = (SELECT MIN(exam_id) FROM exams WHERE exam_name = 'Unit Test 1')
INTERSECT
SELECT student_id FROM results WHERE exam_id = (SELECT MIN(exam_id) FROM exams WHERE exam_name = 'Half-Yearly Examination');

-- EXCEPT: students of class 10 with a Unit Test 1 result but NO Half-Yearly result
SELECT r.student_id FROM results r JOIN exams e ON e.exam_id = r.exam_id JOIN students s ON s.student_id = r.student_id JOIN classes c ON c.class_id = s.class_id
 WHERE e.exam_name = 'Unit Test 1' AND c.class_name = '10'
EXCEPT
SELECT r.student_id FROM results r JOIN exams e ON e.exam_id = r.exam_id WHERE e.exam_name = 'Half-Yearly Examination';

-- ============================================================================
-- 7. VIEWS  (defined in views.sql)
-- ============================================================================
SELECT * FROM v_exam_progress;
SELECT student_name, subject_code, marks_obtained, max_marks, subject_grade FROM v_student_marks
 WHERE admission_no = 'ADM2025002' AND exam_name = 'Unit Test 1';
SELECT exam_name, subject_name, average_marks, highest_marks, students_passed FROM v_subject_stats WHERE exam_id = 1;

-- ============================================================================
-- 8. WINDOW FUNCTIONS and CTEs
-- ============================================================================
-- 8.1 RANK, DENSE_RANK, ROW_NUMBER per exam
SELECT r.exam_id, s.full_name AS student_name, r.percentage,
       RANK()       OVER w AS rank_with_gaps,
       DENSE_RANK() OVER w AS dense_rank_no_gaps,
       ROW_NUMBER() OVER w AS row_no
  FROM results r JOIN students s ON s.student_id = r.student_id
 WHERE r.exam_id = 1
WINDOW w AS (PARTITION BY r.exam_id ORDER BY r.percentage DESC);

-- 8.2 LAG: improvement of each student from Unit Test 1 to Half-Yearly (class 10-A)
SELECT student_name, exam_name, percentage,
       ROUND(percentage - LAG(percentage) OVER (PARTITION BY student_id ORDER BY exam_id), 2) AS change_from_previous
  FROM v_exam_results WHERE class_label = '10-A' ORDER BY student_name, exam_id;

-- 8.3 running total and per-class average next to every row
SELECT student_name, percentage,
       ROUND(AVG(percentage) OVER (PARTITION BY exam_id), 2)           AS exam_average,
       ROUND(percentage - AVG(percentage) OVER (PARTITION BY exam_id), 2) AS vs_average,
       NTILE(4) OVER (PARTITION BY exam_id ORDER BY percentage DESC)    AS quartile
  FROM v_exam_results WHERE exam_id = 2;

-- 8.4 CTE: toppers (rank 1) in every exam
WITH ranked AS (
  SELECT exam_id, exam_name, class_label, student_name, percentage,
         RANK() OVER (PARTITION BY exam_id ORDER BY percentage DESC) AS rnk
    FROM v_exam_results)
SELECT exam_name, class_label, student_name, percentage FROM ranked WHERE rnk = 1;

-- 8.5 multiple CTEs: students whose percentage is in the top 25% of their exam AND who passed
WITH stats AS (
  SELECT exam_id, student_id, percentage, status, PERCENT_RANK() OVER (PARTITION BY exam_id ORDER BY percentage) AS pr FROM results),
top_students AS (SELECT * FROM stats WHERE pr >= 0.75 AND status = 'PASS')
SELECT s.full_name, t.exam_id, t.percentage FROM top_students t JOIN students s ON s.student_id = t.student_id ORDER BY t.exam_id, t.percentage DESC;

-- 8.6 recursive CTE: number sequence used to list the roll numbers 1..8 and spot missing roll numbers in 9-A
WITH RECURSIVE seq AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 10)
SELECT seq.n AS missing_roll_no FROM seq
 WHERE seq.n NOT IN (SELECT roll_no FROM students s JOIN classes c ON c.class_id = s.class_id WHERE c.class_name = '9' AND c.section = 'A');

-- ============================================================================
-- 9. TRANSACTIONS (TCL): COMMIT, ROLLBACK, SAVEPOINT  -  ACID in action
-- ============================================================================
-- Half-Yearly of 10-B is a draft exam, so its marks can be changed.
SET @hy_b = (SELECT e.exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
              WHERE e.exam_name = 'Half-Yearly Examination' AND c.section = 'B');
SET @st   = (SELECT student_id FROM students WHERE admission_no = 'ADM2025009');
SET @eng  = (SELECT subject_id FROM subjects WHERE subject_code = 'ENG');
SET @mat  = (SELECT subject_id FROM subjects WHERE subject_code = 'MAT');

SELECT marks_obtained AS english_before FROM marks WHERE exam_id = @hy_b AND student_id = @st AND subject_id = @eng;

START TRANSACTION;
  CALL sp_save_mark(@hy_b, @st, @eng, 70, 1);          -- step 1
  SAVEPOINT after_english;
  CALL sp_save_mark(@hy_b, @st, @mat, 65, 1);          -- step 2
  SELECT subject_id, marks_obtained AS inside_transaction FROM marks WHERE exam_id = @hy_b AND student_id = @st AND subject_id IN (@eng, @mat);
  ROLLBACK TO SAVEPOINT after_english;                 -- undo only step 2
  SELECT subject_id, marks_obtained AS after_savepoint_rollback FROM marks WHERE exam_id = @hy_b AND student_id = @st AND subject_id IN (@eng, @mat);
ROLLBACK;                                              -- undo everything (use COMMIT to keep)
SELECT marks_obtained AS english_after_rollback FROM marks WHERE exam_id = @hy_b AND student_id = @st AND subject_id = @eng;

-- Atomicity demo: the second call below would violate the trigger (marks > maximum) and raise an error
-- that makes the client roll the transaction back; run in Workbench to watch it:
--   START TRANSACTION;
--   CALL sp_save_mark(@hy_b, @st, @eng, 71, 1);
--   CALL sp_save_mark(@hy_b, @st, @mat, 500, 1);   -- ERROR 1644: Marks must be between 0 and 100
--   ROLLBACK;

-- ============================================================================
-- 10. FUNCTIONS, PROCEDURES, TRIGGERS  (procedures.sql / triggers.sql)
-- ============================================================================
SELECT fn_grade(92.5) AS grade_92_5, fn_grade(55) AS grade_55, fn_grade(20) AS grade_20, fn_percentage(412, 550) AS pct, fn_get_setting('pass_percentage') AS pass_pct;

-- Generate results through the stored procedure (it has its own transaction + savepoint)
CALL sp_generate_results((SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id WHERE e.exam_name = 'Half-Yearly Examination' AND c.section = 'A'));

-- Trigger effects: the audit table filled automatically
SELECT a.action, st.full_name, sub.subject_code, a.old_marks, a.new_marks, a.changed_at
  FROM marks_audit a LEFT JOIN students st ON st.student_id = a.student_id LEFT JOIN subjects sub ON sub.subject_id = a.subject_id
 ORDER BY a.audit_id DESC LIMIT 5;

-- Trigger demos that RAISE errors (uncomment one at a time in Workbench):
--   CALL sp_save_mark(@hy_b, @st, @eng, 150, 1);                 -- marks above maximum
--   CALL sp_save_mark(1, @st, @eng, 50, 1);                      -- published exam is locked / wrong class
--   UPDATE exams SET is_published = 1 WHERE exam_id = @hy_b;     -- no results generated yet
--   UPDATE students SET class_id = 3 WHERE student_id = 1;       -- student already has marks

-- ============================================================================
-- 11. SECURITY (DCL) - full script in security.sql
-- ============================================================================
-- SQL INJECTION: the application NEVER concatenates user input into SQL. It sends
--   SELECT ... FROM users WHERE username = ?      with the value passed separately.
-- What a concatenated query would look like (do NOT do this):
--   "... WHERE username = '" + input + "'"  with input = ' OR '1'='1   =>  returns every user.
-- The same text sent as a bound parameter is just a (non-existent) username:
PREPARE find_user FROM 'SELECT user_id, username, role FROM users WHERE username = ?';
SET @input = '\' OR \'1\'=\'1';
EXECUTE find_user USING @input;               -- returns 0 rows
SET @input = 't.sharma';
EXECUTE find_user USING @input;               -- returns 1 row
DEALLOCATE PREPARE find_user;

-- Roles / privileges (needs CREATE ROLE rights; executed by `npm run db:security`):
--   GRANT SELECT ON result_portal.v_exam_results TO 'portal_student';
--   SHOW GRANTS FOR 'demo_teacher'@'localhost' USING 'portal_teacher';
--   REVOKE UPDATE ON result_portal.marks FROM 'portal_teacher';

-- ============================================================================
-- 12. INDEXING & QUERY OPTIMISATION (Unit 4)
-- ============================================================================
SHOW INDEX FROM marks;

-- 12.1 Index used for lookups by the unique key (exam, student, subject)
EXPLAIN SELECT marks_obtained FROM marks WHERE exam_id = 1 AND student_id = 5 AND subject_id = 3;

-- 12.2 Foreign-key index used for "all marks of a student"
EXPLAIN SELECT * FROM marks WHERE student_id = 5;

-- 12.3 Without a helpful index on students.full_name this would scan the table; we have idx_students_name
EXPLAIN SELECT * FROM students WHERE full_name LIKE 'Aar%';
EXPLAIN SELECT * FROM students WHERE full_name LIKE '%van';          -- leading wildcard cannot use the index

-- 12.4 Compare a join with EXPLAIN FORMAT=TREE / EXPLAIN ANALYZE (actual timings)
EXPLAIN FORMAT=TREE
SELECT st.full_name, SUM(m.marks_obtained) FROM marks m JOIN students st ON st.student_id = m.student_id WHERE m.exam_id = 1 GROUP BY st.student_id, st.full_name;

-- 12.5 Creating / dropping an index and comparing the plan
ALTER TABLE marks_audit ADD INDEX idx_audit_changed (changed_at);
EXPLAIN SELECT * FROM marks_audit WHERE changed_at >= '2025-01-01';
ALTER TABLE marks_audit DROP INDEX idx_audit_changed;

-- 12.6 Heavy-data comparison (200,000 rows, with vs. without index): run `npm run db:benchmark`
