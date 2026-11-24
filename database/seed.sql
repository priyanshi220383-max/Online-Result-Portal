-- ============================================================================
--  seed.sql  -  sample data (MySQL 8.0)
--  Run AFTER schema.sql, procedures.sql, triggers.sql and views.sql.
--  Every demo account uses the password:  Password@123   (bcrypt hash below)
--  Marks are inserted THROUGH the triggers, so validation is exercised too.
-- ============================================================================
USE result_portal;

SET @pw = '$2a$10$4mEggVlkBF8Q/yVtYsNM2.I./BOjuEjDJ5qxAlQ6Cjn6J8X4SKNCS';

-- ---- configuration --------------------------------------------------------
INSERT INTO settings (setting_key, setting_value) VALUES
  ('school_name',          'EduResult Public School'),
  ('school_address',       'Sector 12, Panipat, Haryana'),
  ('principal_name',       'Dr. Meenakshi Verma'),
  ('pass_percentage',      '33'),
  ('require_subject_pass', '1');

INSERT INTO grade_scale (grade, min_percentage) VALUES
  ('A+', 90), ('A', 80), ('B+', 70), ('B', 60), ('C', 50), ('D', 33), ('F', 0);

-- ---- classes & subjects ------------------------------------------------------
INSERT INTO classes (class_name, section, academic_year) VALUES
  ('10', 'A', '2025-26'),
  ('10', 'B', '2025-26'),
  ('9',  'A', '2025-26');

INSERT INTO subjects (subject_code, subject_name, max_marks, pass_marks) VALUES
  ('ENG', 'English',          100, 33),
  ('HIN', 'Hindi',            100, 33),
  ('MAT', 'Mathematics',      100, 33),
  ('SCI', 'Science',          100, 33),
  ('SST', 'Social Science',   100, 33),
  ('CSC', 'Computer Science',  50, 17);

-- ---- users: admin + teachers ---------------------------------------------------
INSERT INTO users (username, password_hash, role) VALUES
  ('admin',        @pw, 'admin'),
  ('t.sharma',     @pw, 'teacher'),
  ('t.kaur',       @pw, 'teacher'),
  ('t.singh',      @pw, 'teacher'),
  ('t.gupta',      @pw, 'teacher');

INSERT INTO teachers (user_id, employee_code, full_name, email, department)
SELECT u.user_id, v.code, v.name, v.email, v.dept
  FROM (VALUES
        ROW('t.sharma', 'T001', 'Rajesh Sharma', 'rajesh.sharma@eduresult.example', 'Mathematics & Computer Science'),
        ROW('t.kaur',   'T002', 'Harpreet Kaur', 'harpreet.kaur@eduresult.example', 'English & Hindi'),
        ROW('t.singh',  'T003', 'Amandeep Singh','amandeep.singh@eduresult.example','Science'),
        ROW('t.gupta',  'T004', 'Neha Gupta',    'neha.gupta@eduresult.example',    'Social Science')
       ) AS v(uname, code, name, email, dept)
  JOIN users u ON u.username = v.uname;

-- every class studies all six subjects; each subject has one teacher
INSERT INTO teaching_assignments (class_id, subject_id, teacher_id)
SELECT c.class_id, s.subject_id, t.teacher_id
  FROM classes c
 CROSS JOIN subjects s
  JOIN teachers t ON t.employee_code = CASE s.subject_code
         WHEN 'MAT' THEN 'T001' WHEN 'CSC' THEN 'T001'
         WHEN 'ENG' THEN 'T002' WHEN 'HIN' THEN 'T002'
         WHEN 'SCI' THEN 'T003'
         WHEN 'SST' THEN 'T004' END;

-- ---- students (24) -------------------------------------------------------------
INSERT INTO students (admission_no, full_name, date_of_birth, gender, class_id, roll_no,
                      guardian_name, guardian_phone, email)
SELECT v.adm, v.name, v.dob, v.gender, c.class_id, v.roll, v.guardian, v.phone, v.email
  FROM (VALUES
    ROW('ADM2025001','Aarav Sharma',   '2010-03-14','Male',  '10','A',1,'Vikas Sharma',  '9812300001','aarav@student.example'),
    ROW('ADM2025002','Ananya Verma',   '2010-07-02','Female','10','A',2,'Sunil Verma',   '9812300002','ananya@student.example'),
    ROW('ADM2025003','Arjun Malhotra', '2010-01-21','Male',  '10','A',3,'Rakesh Malhotra','9812300003','arjun@student.example'),
    ROW('ADM2025004','Diya Chauhan',   '2010-11-09','Female','10','A',4,'Mohan Chauhan', '9812300004','diya@student.example'),
    ROW('ADM2025005','Ishaan Bansal',  '2010-05-30','Male',  '10','A',5,'Anil Bansal',   '9812300005','ishaan@student.example'),
    ROW('ADM2025006','Kavya Mehta',    '2010-09-17','Female','10','A',6,'Pooja Mehta',   '9812300006','kavya@student.example'),
    ROW('ADM2025007','Mohit Yadav',    '2010-02-25','Male',  '10','A',7,'Dinesh Yadav',  '9812300007','mohit@student.example'),
    ROW('ADM2025008','Riya Kapoor',    '2010-12-05','Female','10','A',8,'Sanjay Kapoor', '9812300008','riya@student.example'),
    ROW('ADM2025009','Aditya Rana',    '2010-04-11','Male',  '10','B',1,'Jagdish Rana',  '9812300009','aditya@student.example'),
    ROW('ADM2025010','Bhavna Joshi',   '2010-08-23','Female','10','B',2,'Manoj Joshi',   '9812300010','bhavna@student.example'),
    ROW('ADM2025011','Chirag Saini',   '2010-06-06','Male',  '10','B',3,'Ramesh Saini',  '9812300011','chirag@student.example'),
    ROW('ADM2025012','Esha Tyagi',     '2010-10-19','Female','10','B',4,'Naveen Tyagi',  '9812300012','esha@student.example'),
    ROW('ADM2025013','Farhan Khan',    '2010-03-03','Male',  '10','B',5,'Imran Khan',    '9812300013','farhan@student.example'),
    ROW('ADM2025014','Gauri Nagpal',   '2010-07-28','Female','10','B',6,'Deepak Nagpal', '9812300014','gauri@student.example'),
    ROW('ADM2025015','Harsh Dahiya',   '2010-01-09','Male',  '10','B',7,'Satbir Dahiya', '9812300015','harsh@student.example'),
    ROW('ADM2025016','Isha Goyal',     '2010-12-27','Female','10','B',8,'Pankaj Goyal',  '9812300016','isha@student.example'),
    ROW('ADM2025017','Jatin Arora',    '2011-02-15','Male',  '9', 'A',1,'Surinder Arora','9812300017','jatin@student.example'),
    ROW('ADM2025018','Khushi Dhingra', '2011-05-12','Female','9', 'A',2,'Rohit Dhingra', '9812300018','khushi@student.example'),
    ROW('ADM2025019','Lakshay Chopra', '2011-09-01','Male',  '9', 'A',3,'Ajay Chopra',   '9812300019','lakshay@student.example'),
    ROW('ADM2025020','Muskan Sethi',   '2011-03-22','Female','9', 'A',4,'Vijay Sethi',   '9812300020','muskan@student.example'),
    ROW('ADM2025021','Nikhil Ahuja',   '2011-07-14','Male',  '9', 'A',5,'Girish Ahuja',  '9812300021','nikhil@student.example'),
    ROW('ADM2025022','Pooja Rathi',    '2011-11-30','Female','9', 'A',6,'Sudhir Rathi',  '9812300022','pooja@student.example'),
    ROW('ADM2025023','Rohan Dalal',    '2011-04-04','Male',  '9', 'A',7,'Karan Dalal',   '9812300023','rohan@student.example'),
    ROW('ADM2025024','Simran Sandhu',  '2011-08-18','Female','9', 'A',8,'Gurmeet Sandhu','9812300024','simran@student.example')
  ) AS v(adm, name, dob, gender, cname, sec, roll, guardian, phone, email)
  JOIN classes c ON c.class_name = v.cname AND c.section = v.sec AND c.academic_year = '2025-26';

-- student login accounts: username = admission number
INSERT INTO users (username, password_hash, role)
SELECT admission_no, @pw, 'student' FROM students ORDER BY student_id;

UPDATE students s JOIN users u ON u.username = s.admission_no SET s.user_id = u.user_id;

-- ---- examinations --------------------------------------------------------------
INSERT INTO exams (exam_name, class_id, exam_date)
SELECT 'Unit Test 1', class_id, '2025-08-20' FROM classes ORDER BY class_id;
INSERT INTO exams (exam_name, class_id, exam_date)
SELECT 'Half-Yearly Examination', class_id, '2025-10-15' FROM classes WHERE class_name = '10' ORDER BY class_id;

-- ---- marks (validated by triggers) ------------------------------------------------
-- Deterministic pseudo-random scores between ~38% and ~94% of each subject's maximum.
-- Unit Test 1 (all classes) and Half-Yearly 10-A are complete.
-- Half-Yearly 10-B only has English, Mathematics and Science entered (marks entry demo).
INSERT INTO marks (exam_id, student_id, subject_id, marks_obtained, entered_by)
SELECT e.exam_id, st.student_id, ta.subject_id,
       ROUND(sub.max_marks * (38 + MOD(st.student_id * 37 + ta.subject_id * 17 + e.exam_id * 11, 57)) / 100),
       (SELECT t.user_id FROM teachers t WHERE t.teacher_id = ta.teacher_id)
  FROM exams e
  JOIN students st             ON st.class_id = e.class_id
  JOIN teaching_assignments ta ON ta.class_id = e.class_id
  JOIN subjects sub            ON sub.subject_id = ta.subject_id
  JOIN classes c               ON c.class_id = e.class_id
 WHERE e.exam_name = 'Unit Test 1'
    OR (e.exam_name = 'Half-Yearly Examination' AND c.section = 'A')
    OR (e.exam_name = 'Half-Yearly Examination' AND c.section = 'B' AND sub.subject_code IN ('ENG','MAT','SCI'));

-- A few weak performances so that FAIL cases exist (Mathematics below pass marks)
UPDATE marks m
  JOIN subjects sub ON sub.subject_id = m.subject_id
   SET m.marks_obtained = 24
 WHERE sub.subject_code = 'MAT'
   AND m.exam_id = (SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
                     WHERE e.exam_name = 'Unit Test 1' AND c.class_name = '10' AND c.section = 'A')
   AND m.student_id = (SELECT student_id FROM students WHERE admission_no = 'ADM2025005');

UPDATE marks m
  JOIN subjects sub ON sub.subject_id = m.subject_id
   SET m.marks_obtained = 21
 WHERE sub.subject_code = 'SCI'
   AND m.exam_id = (SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
                     WHERE e.exam_name = 'Unit Test 1' AND c.class_name = '9')
   AND m.student_id = (SELECT student_id FROM students WHERE admission_no = 'ADM2025023');

-- ---- results: generate with the stored procedure, then publish Unit Test 1 ----------
CALL sp_generate_results((SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
                           WHERE e.exam_name = 'Unit Test 1' AND c.class_name = '10' AND c.section = 'A'));
CALL sp_generate_results((SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
                           WHERE e.exam_name = 'Unit Test 1' AND c.class_name = '10' AND c.section = 'B'));
CALL sp_generate_results((SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
                           WHERE e.exam_name = 'Unit Test 1' AND c.class_name = '9'));
CALL sp_generate_results((SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
                           WHERE e.exam_name = 'Half-Yearly Examination' AND c.section = 'A'));

-- the publishing trigger checks that results exist and are not stale
UPDATE exams SET is_published = 1 WHERE exam_name = 'Unit Test 1';

-- start the audit trail fresh, then record one genuine correction (audit trigger demo)
TRUNCATE TABLE marks_audit;

UPDATE marks m
  JOIN subjects sub ON sub.subject_id = m.subject_id
   SET m.marks_obtained = m.marks_obtained + 2, m.entered_by = (SELECT user_id FROM users WHERE username = 't.kaur')
 WHERE sub.subject_code = 'ENG'
   AND m.exam_id = (SELECT exam_id FROM exams e JOIN classes c ON c.class_id = e.class_id
                     WHERE e.exam_name = 'Half-Yearly Examination' AND c.section = 'B')
   AND m.student_id = (SELECT student_id FROM students WHERE admission_no = 'ADM2025011');
