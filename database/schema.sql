-- ============================================================================
--  Online Result / Report-Card Generation Portal  -  schema.sql   (MySQL 8.0+)
--  UNIT 1: relational schema, keys, integrity constraints, normalisation.
--  Running this file RESETS all tables (DROP TABLE IF EXISTS ...).
-- ============================================================================
CREATE DATABASE IF NOT EXISTS result_portal
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE result_portal;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS marks_audit, results, marks, exams, teaching_assignments,
                     students, teachers, subjects, classes, grade_scale, settings, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- users : login accounts. Only authentication data lives here (3NF: personal
-- details of students/teachers live in their own tables).
-- Candidate keys: user_id, username.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  user_id        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  username       VARCHAR(50)   NOT NULL,
  password_hash  VARCHAR(100)  NOT NULL,          -- bcrypt hash, never plain text
  role           ENUM('admin','teacher','student') NOT NULL,
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),
  CONSTRAINT ck_users_active CHECK (is_active IN (0,1))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- classes : e.g. "10 - A" for academic year "2025-26".
-- Candidate key (besides class_id): (class_name, section, academic_year)
-- ---------------------------------------------------------------------------
CREATE TABLE classes (
  class_id       INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  class_name     VARCHAR(20)   NOT NULL,
  section        VARCHAR(5)    NOT NULL DEFAULT 'A',
  academic_year  VARCHAR(9)    NOT NULL,           -- e.g. 2025-26
  PRIMARY KEY (class_id),
  UNIQUE KEY uq_class (class_name, section, academic_year)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- teachers : 1:1 with a login account (users). Candidate keys: employee_code, user_id.
-- ---------------------------------------------------------------------------
CREATE TABLE teachers (
  teacher_id     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED  NOT NULL,
  employee_code  VARCHAR(20)   NOT NULL,
  full_name      VARCHAR(100)  NOT NULL,
  email          VARCHAR(120)  NULL,
  department     VARCHAR(60)   NULL,
  PRIMARY KEY (teacher_id),
  UNIQUE KEY uq_teacher_employee (employee_code),
  UNIQUE KEY uq_teacher_user (user_id),
  CONSTRAINT fk_teacher_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- students : belongs to one class (1:N). user_id is optional (student login).
-- Candidate keys: admission_no, (class_id, roll_no), user_id.
-- ---------------------------------------------------------------------------
CREATE TABLE students (
  student_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NULL,
  admission_no    VARCHAR(20)  NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  date_of_birth   DATE         NULL,
  gender          ENUM('Male','Female','Other') NOT NULL DEFAULT 'Other',
  class_id        INT UNSIGNED NOT NULL,
  roll_no         INT UNSIGNED NOT NULL,
  guardian_name   VARCHAR(100) NULL,
  guardian_phone  VARCHAR(20)  NULL,
  email           VARCHAR(120) NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id),
  UNIQUE KEY uq_student_admission (admission_no),
  UNIQUE KEY uq_student_user (user_id),
  UNIQUE KEY uq_student_roll (class_id, roll_no),
  KEY idx_students_name (full_name),
  CONSTRAINT fk_student_user  FOREIGN KEY (user_id)  REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_student_class FOREIGN KEY (class_id) REFERENCES classes(class_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_student_roll CHECK (roll_no > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- subjects : subject code + the maximum / passing marks for the subject.
-- ---------------------------------------------------------------------------
CREATE TABLE subjects (
  subject_id    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  subject_code  VARCHAR(10)   NOT NULL,
  subject_name  VARCHAR(80)   NOT NULL,
  max_marks     SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  pass_marks    SMALLINT UNSIGNED NOT NULL DEFAULT 33,
  PRIMARY KEY (subject_id),
  UNIQUE KEY uq_subject_code (subject_code),
  CONSTRAINT ck_subject_max  CHECK (max_marks > 0),
  CONSTRAINT ck_subject_pass CHECK (pass_marks <= max_marks)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- teaching_assignments : resolves the M:N relation between classes and subjects
-- ("which subjects does a class study?") and records who teaches it.
-- One teacher per (class, subject)  =>  UNIQUE (class_id, subject_id).
-- ---------------------------------------------------------------------------
CREATE TABLE teaching_assignments (
  assignment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id      INT UNSIGNED NOT NULL,
  subject_id    INT UNSIGNED NOT NULL,
  teacher_id    INT UNSIGNED NULL,
  PRIMARY KEY (assignment_id),
  UNIQUE KEY uq_class_subject (class_id, subject_id),
  KEY idx_assign_teacher (teacher_id),
  CONSTRAINT fk_ta_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id)    ON DELETE CASCADE,
  CONSTRAINT fk_ta_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE RESTRICT,
  CONSTRAINT fk_ta_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- exams : an examination held for one class.  Candidate key (exam_name, class_id).
-- is_published controls whether students may see the report card.
-- ---------------------------------------------------------------------------
CREATE TABLE exams (
  exam_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_name     VARCHAR(80)  NOT NULL,
  class_id      INT UNSIGNED NOT NULL,
  exam_date     DATE         NULL,
  is_published  TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (exam_id),
  UNIQUE KEY uq_exam (exam_name, class_id),
  CONSTRAINT fk_exam_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE RESTRICT,
  CONSTRAINT ck_exam_published CHECK (is_published IN (0,1))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- marks : one row per (exam, student, subject).  Composite candidate key.
-- max_marks is NOT copied here: it is derived from subjects (3NF).
-- Range check against subject max is enforced by trigger (see triggers.sql),
-- because a CHECK constraint cannot look into another table.
-- ---------------------------------------------------------------------------
CREATE TABLE marks (
  mark_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_id         INT UNSIGNED NOT NULL,
  student_id      INT UNSIGNED NOT NULL,
  subject_id      INT UNSIGNED NOT NULL,
  marks_obtained  DECIMAL(5,2) NOT NULL,
  entered_by      INT UNSIGNED NULL,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (mark_id),
  UNIQUE KEY uq_mark (exam_id, student_id, subject_id),
  KEY idx_marks_student (student_id),
  KEY idx_marks_subject (subject_id),
  CONSTRAINT fk_mark_exam    FOREIGN KEY (exam_id)    REFERENCES exams(exam_id)       ON DELETE CASCADE,
  CONSTRAINT fk_mark_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_mark_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE RESTRICT,
  CONSTRAINT fk_mark_user    FOREIGN KEY (entered_by) REFERENCES users(user_id)       ON DELETE SET NULL,
  CONSTRAINT ck_marks_nonneg CHECK (marks_obtained >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- grade_scale : configurable grading.  A percentage gets the grade with the
-- highest min_percentage that is <= the percentage.  Must contain a 0 row.
-- ---------------------------------------------------------------------------
CREATE TABLE grade_scale (
  grade           VARCHAR(3)   NOT NULL,
  min_percentage  DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (grade),
  UNIQUE KEY uq_grade_min (min_percentage),
  CONSTRAINT ck_grade_range CHECK (min_percentage BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- settings : key/value configuration (school name, pass rules ...).
-- ---------------------------------------------------------------------------
CREATE TABLE settings (
  setting_key    VARCHAR(40)  NOT NULL,
  setting_value  VARCHAR(200) NOT NULL,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- results : generated summary of one student's performance in one exam.
-- This is DERIVED data (total/percentage/grade/status) stored on purpose as a
-- controlled summary table. It is only written by sp_generate_results, and
-- triggers mark a row stale when its underlying marks change.
-- ---------------------------------------------------------------------------
CREATE TABLE results (
  result_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_id       INT UNSIGNED NOT NULL,
  student_id    INT UNSIGNED NOT NULL,
  total_marks   DECIMAL(7,2) NOT NULL,
  max_total     DECIMAL(7,2) NOT NULL,
  percentage    DECIMAL(5,2) NOT NULL,
  grade         VARCHAR(3)   NOT NULL,
  status        ENUM('PASS','FAIL') NOT NULL,
  is_stale      TINYINT(1)   NOT NULL DEFAULT 0,
  generated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (result_id),
  UNIQUE KEY uq_result (exam_id, student_id),
  KEY idx_results_student (student_id),
  CONSTRAINT fk_result_exam    FOREIGN KEY (exam_id)    REFERENCES exams(exam_id)       ON DELETE CASCADE,
  CONSTRAINT fk_result_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT ck_result_pct CHECK (percentage BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- marks_audit : history of every mark change, filled by triggers (Unit 3).
-- No foreign keys on purpose: an audit trail must survive deletions.
-- ---------------------------------------------------------------------------
CREATE TABLE marks_audit (
  audit_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_id     INT UNSIGNED NOT NULL,
  student_id  INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED NOT NULL,
  action      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  old_marks   DECIMAL(5,2) NULL,
  new_marks   DECIMAL(5,2) NULL,
  changed_by  INT UNSIGNED NULL,
  changed_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  KEY idx_audit_exam_student (exam_id, student_id)
) ENGINE=InnoDB;
