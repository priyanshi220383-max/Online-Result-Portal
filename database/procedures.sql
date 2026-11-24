-- ============================================================================
--  procedures.sql  -  stored FUNCTIONS and PROCEDURES (MySQL 8.0)     UNIT 3
--  Run AFTER schema.sql.   Uses DELIMITER, so import with the mysql client,
--  MySQL Workbench, or `npm run db:setup` (which understands DELIMITER).
-- ============================================================================
USE result_portal;

DELIMITER $$

-- ---------------------------------------------------------------------------
-- FUNCTION fn_get_setting : read one configuration value (e.g. pass_percentage)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_get_setting$$
CREATE FUNCTION fn_get_setting(p_key VARCHAR(40))
RETURNS VARCHAR(200)
READS SQL DATA
BEGIN
  DECLARE v_value VARCHAR(200);
  SELECT setting_value INTO v_value FROM settings WHERE setting_key = p_key;
  RETURN v_value;
END$$

-- ---------------------------------------------------------------------------
-- FUNCTION fn_percentage : obtained / maximum * 100, rounded to 2 decimals
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_percentage$$
CREATE FUNCTION fn_percentage(p_obtained DECIMAL(8,2), p_max DECIMAL(8,2))
RETURNS DECIMAL(5,2)
DETERMINISTIC
BEGIN
  IF p_max IS NULL OR p_max <= 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND(p_obtained / p_max * 100, 2);
END$$

-- ---------------------------------------------------------------------------
-- FUNCTION fn_grade : grade for a percentage using the configurable grade_scale
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_grade$$
CREATE FUNCTION fn_grade(p_percentage DECIMAL(5,2))
RETURNS VARCHAR(3)
READS SQL DATA
BEGIN
  DECLARE v_grade VARCHAR(3);
  SELECT grade INTO v_grade
    FROM grade_scale
   WHERE min_percentage <= p_percentage
   ORDER BY min_percentage DESC
   LIMIT 1;
  RETURN IFNULL(v_grade, 'NA');
END$$

-- ---------------------------------------------------------------------------
-- PROCEDURE sp_validate_mark : the single place where a mark is validated.
-- Called by the BEFORE INSERT / BEFORE UPDATE triggers on `marks`.
-- Raises SQLSTATE '45000' with a readable message when the entry is invalid.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_validate_mark$$
CREATE PROCEDURE sp_validate_mark(
  IN p_exam_id    INT UNSIGNED,
  IN p_student_id INT UNSIGNED,
  IN p_subject_id INT UNSIGNED,
  IN p_marks      DECIMAL(5,2)
)
BEGIN
  DECLARE v_exam_class    INT UNSIGNED;
  DECLARE v_published     TINYINT;
  DECLARE v_student_class INT UNSIGNED;
  DECLARE v_max           INT UNSIGNED;
  DECLARE v_assigned      INT DEFAULT 0;
  DECLARE v_msg           VARCHAR(128);

  SELECT class_id, is_published INTO v_exam_class, v_published
    FROM exams WHERE exam_id = p_exam_id;
  SELECT class_id INTO v_student_class FROM students WHERE student_id = p_student_id;
  SELECT max_marks INTO v_max FROM subjects WHERE subject_id = p_subject_id;

  IF v_exam_class IS NULL OR v_student_class IS NULL OR v_max IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid exam, student or subject.';
  END IF;

  IF v_published = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'This examination is published; unpublish it before changing marks.';
  END IF;

  IF v_student_class <> v_exam_class THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student does not belong to the class this examination is for.';
  END IF;

  SELECT COUNT(*) INTO v_assigned
    FROM teaching_assignments
   WHERE class_id = v_exam_class AND subject_id = p_subject_id;
  IF v_assigned = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This subject is not taught in the examination''s class.';
  END IF;

  IF p_marks < 0 OR p_marks > v_max THEN
    SET v_msg = CONCAT('Marks must be between 0 and ', v_max, ' for this subject.');
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
  END IF;
END$$

-- ---------------------------------------------------------------------------
-- PROCEDURE sp_save_mark : insert or update one mark (UPSERT). Validation is
-- performed by the triggers, so no rule is duplicated here.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_save_mark$$
CREATE PROCEDURE sp_save_mark(
  IN p_exam_id    INT UNSIGNED,
  IN p_student_id INT UNSIGNED,
  IN p_subject_id INT UNSIGNED,
  IN p_marks      DECIMAL(5,2),
  IN p_user_id    INT UNSIGNED
)
BEGIN
  INSERT INTO marks (exam_id, student_id, subject_id, marks_obtained, entered_by)
  VALUES (p_exam_id, p_student_id, p_subject_id, p_marks, p_user_id)
  ON DUPLICATE KEY UPDATE marks_obtained = p_marks, entered_by = p_user_id;
END$$

-- ---------------------------------------------------------------------------
-- PROCEDURE sp_generate_results : calculates total, percentage, grade and
-- PASS/FAIL for every student of the exam's class whose marks are COMPLETE
-- (one mark for each subject taught in the class).
--
-- TRANSACTION demo: everything runs inside START TRANSACTION; a SAVEPOINT is
-- taken, and any SQL error rolls back to it and re-raises the error, so the
-- results table is never left half-written (Atomicity).
--
-- Pass rule (configurable in `settings`):
--   percentage >= pass_percentage
--   AND (require_subject_pass = 0  OR  every subject mark >= subject.pass_marks)
-- Returns one row: generated_count, incomplete_count.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_generate_results$$
CREATE PROCEDURE sp_generate_results(IN p_exam_id INT UNSIGNED)
BEGIN
  DECLARE v_class      INT UNSIGNED;
  DECLARE v_subjects   INT DEFAULT 0;
  DECLARE v_students   INT DEFAULT 0;
  DECLARE v_generated  INT DEFAULT 0;
  DECLARE v_pass_pct   DECIMAL(5,2);
  DECLARE v_req_subj   TINYINT;

  SELECT class_id INTO v_class FROM exams WHERE exam_id = p_exam_id;
  IF v_class IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Examination not found.';
  END IF;

  SELECT COUNT(*) INTO v_subjects FROM teaching_assignments WHERE class_id = v_class;
  IF v_subjects = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No subjects are assigned to this class.';
  END IF;

  SET v_pass_pct = IFNULL(CAST(fn_get_setting('pass_percentage') AS DECIMAL(5,2)), 33);
  SET v_req_subj = IFNULL(CAST(fn_get_setting('require_subject_pass') AS UNSIGNED), 1);
  SELECT COUNT(*) INTO v_students FROM students WHERE class_id = v_class;

  -- Inner block: its own error handler undoes the transaction on any failure.
  BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK TO SAVEPOINT before_generate;
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SAVEPOINT before_generate;

  DELETE FROM results WHERE exam_id = p_exam_id;

  INSERT INTO results
         (exam_id, student_id, total_marks, max_total, percentage, grade, status, is_stale)
  SELECT p_exam_id, t.student_id, t.total, t.max_total, t.pct, fn_grade(t.pct),
         IF(t.pct >= v_pass_pct AND (v_req_subj = 0 OR t.failed_subjects = 0), 'PASS', 'FAIL'),
         0
    FROM (
          SELECT m.student_id,
                 SUM(m.marks_obtained)                       AS total,
                 SUM(s.max_marks)                            AS max_total,
                 fn_percentage(SUM(m.marks_obtained), SUM(s.max_marks)) AS pct,
                 SUM(m.marks_obtained < s.pass_marks)        AS failed_subjects
            FROM marks m
            JOIN subjects s              ON s.subject_id = m.subject_id
            JOIN teaching_assignments ta ON ta.class_id = v_class AND ta.subject_id = m.subject_id
           WHERE m.exam_id = p_exam_id
           GROUP BY m.student_id
          HAVING COUNT(*) = v_subjects
         ) t;
  SET v_generated = ROW_COUNT();

  COMMIT;
  END;

  SELECT v_generated AS generated_count, v_students - v_generated AS incomplete_count;
END$$

DELIMITER ;
