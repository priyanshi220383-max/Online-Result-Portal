-- ============================================================================
--  triggers.sql  -  TRIGGERS (MySQL 8.0)                              UNIT 3
--  Run AFTER schema.sql and procedures.sql.
--
--  1. marks BEFORE INSERT/UPDATE : validate the mark (range, class, subject,
--                                  published exam) through sp_validate_mark.
--  2. marks AFTER  INSERT/UPDATE/DELETE : write an audit row and flag the
--                                  student's result as stale.
--  3. exams BEFORE UPDATE        : an exam can only be published when every
--                                  result is generated and up to date.
--  4. students BEFORE UPDATE     : class cannot change once marks exist.
-- ============================================================================
USE result_portal;

DELIMITER $$

-- 1. Validation ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_marks_bi$$
CREATE TRIGGER trg_marks_bi BEFORE INSERT ON marks FOR EACH ROW
BEGIN
  CALL sp_validate_mark(NEW.exam_id, NEW.student_id, NEW.subject_id, NEW.marks_obtained);
END$$

DROP TRIGGER IF EXISTS trg_marks_bu$$
CREATE TRIGGER trg_marks_bu BEFORE UPDATE ON marks FOR EACH ROW
BEGIN
  CALL sp_validate_mark(NEW.exam_id, NEW.student_id, NEW.subject_id, NEW.marks_obtained);
END$$

DROP TRIGGER IF EXISTS trg_marks_bd$$
CREATE TRIGGER trg_marks_bd BEFORE DELETE ON marks FOR EACH ROW
BEGIN
  IF (SELECT is_published FROM exams WHERE exam_id = OLD.exam_id) = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'This examination is published; unpublish it before deleting marks.';
  END IF;
END$$

-- 2. Audit trail + result invalidation ---------------------------------------
DROP TRIGGER IF EXISTS trg_marks_ai$$
CREATE TRIGGER trg_marks_ai AFTER INSERT ON marks FOR EACH ROW
BEGIN
  INSERT INTO marks_audit (exam_id, student_id, subject_id, action, old_marks, new_marks, changed_by)
  VALUES (NEW.exam_id, NEW.student_id, NEW.subject_id, 'INSERT', NULL, NEW.marks_obtained, NEW.entered_by);
  UPDATE results SET is_stale = 1
   WHERE exam_id = NEW.exam_id AND student_id = NEW.student_id;
END$$

DROP TRIGGER IF EXISTS trg_marks_au$$
CREATE TRIGGER trg_marks_au AFTER UPDATE ON marks FOR EACH ROW
BEGIN
  IF OLD.marks_obtained <> NEW.marks_obtained THEN
    INSERT INTO marks_audit (exam_id, student_id, subject_id, action, old_marks, new_marks, changed_by)
    VALUES (NEW.exam_id, NEW.student_id, NEW.subject_id, 'UPDATE', OLD.marks_obtained, NEW.marks_obtained, NEW.entered_by);
    UPDATE results SET is_stale = 1
     WHERE exam_id = NEW.exam_id AND student_id = NEW.student_id;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_marks_ad$$
CREATE TRIGGER trg_marks_ad AFTER DELETE ON marks FOR EACH ROW
BEGIN
  INSERT INTO marks_audit (exam_id, student_id, subject_id, action, old_marks, new_marks, changed_by)
  VALUES (OLD.exam_id, OLD.student_id, OLD.subject_id, 'DELETE', OLD.marks_obtained, NULL, OLD.entered_by);
  UPDATE results SET is_stale = 1
   WHERE exam_id = OLD.exam_id AND student_id = OLD.student_id;
END$$

-- 3. Publishing guard ---------------------------------------------------------
DROP TRIGGER IF EXISTS trg_exams_bu$$
CREATE TRIGGER trg_exams_bu BEFORE UPDATE ON exams FOR EACH ROW
BEGIN
  IF OLD.is_published = 0 AND NEW.is_published = 1 THEN
    IF (SELECT COUNT(*) FROM results WHERE exam_id = OLD.exam_id) = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Generate results before publishing this examination.';
    END IF;
    IF (SELECT COUNT(*) FROM results WHERE exam_id = OLD.exam_id AND is_stale = 1) > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Some results are out of date because marks changed. Regenerate results first.';
    END IF;
  END IF;
END$$

-- 4. Referential protection ----------------------------------------------------
DROP TRIGGER IF EXISTS trg_students_bu$$
CREATE TRIGGER trg_students_bu BEFORE UPDATE ON students FOR EACH ROW
BEGIN
  IF NEW.class_id <> OLD.class_id
     AND EXISTS (SELECT 1 FROM marks WHERE student_id = OLD.student_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot change the class of a student who already has marks recorded.';
  END IF;
END$$

DELIMITER ;
