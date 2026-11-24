-- ============================================================================
--  security.sql  -  DATABASE SECURITY: roles, privileges, users   (MySQL 8.0)
--  UNIT 3 (DCL: CREATE ROLE / CREATE USER / GRANT / REVOKE)
--  Needs an account allowed to create users (e.g. root). Run with:
--      npm run db:security        (or the mysql client / Workbench)
--  Skip this file on cloud databases that do not allow CREATE ROLE/USER.
--
--  The web application connects with ONE account (portal_app) and enforces
--  admin/teacher/student rules in the API (JWT + role middleware). These
--  database roles show the same least-privilege idea at the SQL level and
--  can be demonstrated with:  mysql -u demo_teacher -p result_portal
-- ============================================================================
USE result_portal;

CREATE ROLE IF NOT EXISTS 'portal_admin', 'portal_teacher', 'portal_student';

-- Administrator: full control of the portal's data
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON result_portal.* TO 'portal_admin';

-- Teacher: read reference data, enter/update marks, run the result procedures
GRANT SELECT ON result_portal.students             TO 'portal_teacher';
GRANT SELECT ON result_portal.subjects             TO 'portal_teacher';
GRANT SELECT ON result_portal.classes              TO 'portal_teacher';
GRANT SELECT ON result_portal.exams                TO 'portal_teacher';
GRANT SELECT ON result_portal.teaching_assignments TO 'portal_teacher';
GRANT SELECT, INSERT, UPDATE ON result_portal.marks   TO 'portal_teacher';
GRANT SELECT ON result_portal.results              TO 'portal_teacher';
GRANT SELECT ON result_portal.v_student_marks      TO 'portal_teacher';
GRANT SELECT ON result_portal.v_exam_results       TO 'portal_teacher';
GRANT EXECUTE ON PROCEDURE result_portal.sp_save_mark        TO 'portal_teacher';
GRANT EXECUTE ON PROCEDURE result_portal.sp_generate_results TO 'portal_teacher';

-- Student: read-only access to result views only (no base tables, no marks writes)
GRANT SELECT ON result_portal.v_student_marks TO 'portal_student';
GRANT SELECT ON result_portal.v_exam_results  TO 'portal_student';

-- Application account used by the Node.js API (least privilege: no DROP / ALTER / GRANT)
CREATE USER IF NOT EXISTS 'portal_app'@'localhost' IDENTIFIED BY 'ChangeMe_App#2025';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON result_portal.* TO 'portal_app'@'localhost';

-- Demo accounts for showing role-based privileges in a SQL client
CREATE USER IF NOT EXISTS 'demo_admin'@'localhost'   IDENTIFIED BY 'Demo_Admin#2025';
CREATE USER IF NOT EXISTS 'demo_teacher'@'localhost' IDENTIFIED BY 'Demo_Teacher#2025';
CREATE USER IF NOT EXISTS 'demo_student'@'localhost' IDENTIFIED BY 'Demo_Student#2025';
GRANT 'portal_admin'   TO 'demo_admin'@'localhost';
GRANT 'portal_teacher' TO 'demo_teacher'@'localhost';
GRANT 'portal_student' TO 'demo_student'@'localhost';
SET DEFAULT ROLE ALL TO 'demo_admin'@'localhost', 'demo_teacher'@'localhost', 'demo_student'@'localhost';

-- REVOKE example: teachers may not change marks after all (kept as a demonstration)
-- REVOKE UPDATE ON result_portal.marks FROM 'portal_teacher';

-- Inspect the result
-- SHOW GRANTS FOR 'demo_teacher'@'localhost' USING 'portal_teacher';

FLUSH PRIVILEGES;
