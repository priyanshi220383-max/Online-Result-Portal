# DBMS Syllabus -> Implementation Map

Database: **MySQL 8.0** (primary source of truth). Optional **MongoDB** for report-card snapshots.
ER diagram: [`ER-diagram.png`](ER-diagram.png) / [`ER-diagram.svg`](ER-diagram.svg).

---------------------------------------------------------------------------------------------------

## UNIT 1 - Database design & relational model  (`database/schema.sql`)

### Entities and relationships
| Relationship | Cardinality | Implemented by |
|---|---|---|
| class - student | 1 : N | `students.class_id` -> `classes` |
| class - exam | 1 : N | `exams.class_id` -> `classes` |
| class - subject | M : N | resolved by `teaching_assignments` (also stores the teacher: teacher - assignment is 1 : N) |
| exam - student - subject | ternary M : N : N | resolved by `marks` (one row per exam, student, subject) |
| exam - student | 1 : N per student | `results` (one summary row per exam and student) |
| user - student / teacher | 1 : 0..1 / 1 : 1 | `students.user_id`, `teachers.user_id` (login account) |

### Relational schema  (PK underlined by *, FK -> target)
```
users(user_id*, username, password_hash, role, is_active, created_at)
classes(class_id*, class_name, section, academic_year)
teachers(teacher_id*, user_id -> users, employee_code, full_name, email, department)
students(student_id*, user_id -> users, admission_no, full_name, date_of_birth, gender,
         class_id -> classes, roll_no, guardian_name, guardian_phone, email, created_at)
subjects(subject_id*, subject_code, subject_name, max_marks, pass_marks)
teaching_assignments(assignment_id*, class_id -> classes, subject_id -> subjects, teacher_id -> teachers)
exams(exam_id*, exam_name, class_id -> classes, exam_date, is_published)
marks(mark_id*, exam_id -> exams, student_id -> students, subject_id -> subjects,
      marks_obtained, entered_by -> users, updated_at)
results(result_id*, exam_id -> exams, student_id -> students, total_marks, max_total,
        percentage, grade, status, is_stale, generated_at)
grade_scale(grade*, min_percentage)          settings(setting_key*, setting_value)
marks_audit(audit_id*, exam_id, student_id, subject_id, action, old_marks, new_marks, changed_by, changed_at)
```

### Keys
* **Candidate keys** (all declared `UNIQUE`): `users.username`; `students.admission_no`; `(students.class_id, roll_no)`;
  `teachers.employee_code`; `subjects.subject_code`; `(exams.exam_name, class_id)`; `(marks.exam_id, student_id, subject_id)`;
  `(results.exam_id, student_id)`; `(classes.class_name, section, academic_year)`; `(teaching_assignments.class_id, subject_id)`.
* Surrogate **primary keys** (`*_id`) were chosen for compact foreign keys.
* **Foreign keys** use deliberate actions: `ON DELETE CASCADE` for dependants (marks/results of a deleted student),
  `RESTRICT` where deletion would lose history (a class with students, a subject used in a class), `SET NULL` for optional links.

### Integrity constraints
`NOT NULL`, `UNIQUE`, `CHECK` (`max_marks > 0`, `pass_marks <= max_marks`, `marks_obtained >= 0`, `percentage BETWEEN 0 AND 100`,
`roll_no > 0`), `ENUM` domains (role, gender, status), foreign keys. Rules that need *another table* (marks <= subject maximum,
student belongs to the exam's class, subject taught in that class, exam not published) are enforced by **triggers**
(a `CHECK` cannot read other tables) - see Unit 3.

### Functional dependencies (main tables)
```
students:  student_id -> all columns;  admission_no -> student_id;  (class_id, roll_no) -> student_id
subjects:  subject_id -> subject_code, subject_name, max_marks, pass_marks;  subject_code -> subject_id
exams:     exam_id -> exam_name, class_id, exam_date, is_published;  (exam_name, class_id) -> exam_id
classes:   class_id -> class_name, section, academic_year
marks:     (exam_id, student_id, subject_id) -> marks_obtained, entered_by, updated_at
results:   (exam_id, student_id) -> total_marks, max_total, percentage, grade, status
```

### Normalisation (1NF -> 3NF / BCNF)
* **1NF** - every column is atomic; no repeating groups (a student's subjects are rows in `marks`, not columns `maths, science, ...`).
* **2NF** - in `marks` every non-key column depends on the *whole* key `(exam, student, subject)`. Subject name/code/max do
  **not** appear there (they depend only on `subject_id`), so there is no partial dependency.
* **3NF** - no transitive dependencies: `students` stores `class_id`, not class name/section; `marks` does not store `max_marks`
  (derivable from `subjects`); `exams` does not store `academic_year` (derivable from the class). Student and class data are
  not repeated in marks or results.
* **BCNF** - in every table each determinant is a candidate key (e.g. `students`: `student_id`, `admission_no`, `(class_id, roll_no)`
  are all candidate keys), so the schema is in BCNF.
* **Controlled denormalisation (documented):** `results` stores derived totals, percentage, grade and status. This is a
  *summary table*, written only by `sp_generate_results`, and triggers flag rows `is_stale` when marks change. It avoids
  recomputing the whole exam for every report-card view.

---------------------------------------------------------------------------------------------------

## UNIT 2 - SQL queries & advanced operations  (`database/queries.sql`, `views.sql`)
| Concept | Where |
|---|---|
| DDL (CREATE/ALTER/TRUNCATE/DROP) | `schema.sql`; `queries.sql` section 1 |
| DML (INSERT/UPDATE/DELETE/SELECT) | `seed.sql`; `queries.sql` section 2; every controller/model |
| DCL (CREATE ROLE/USER, GRANT, REVOKE) | `security.sql`; `queries.sql` section 11 |
| TCL (START TRANSACTION/COMMIT/ROLLBACK/SAVEPOINT) | `queries.sql` section 9, `procedures.sql`, `backend/config/db.js` |
| INNER / LEFT / RIGHT / FULL (UNION) / CROSS JOIN, **self join** | `queries.sql` section 3 |
| Aggregates, GROUP BY, HAVING | section 4, `views.sql` (`v_subject_stats`) |
| Subqueries (scalar, correlated, IN, NOT EXISTS, derived table) | section 5 |
| Set operations UNION / INTERSECT / EXCEPT | section 6 |
| Views | `views.sql`: `v_student_marks`, `v_exam_results`, `v_subject_stats`, `v_exam_progress` (used by the app) |
| Window functions | `RANK() OVER`, `LAG`, `NTILE`, `PERCENT_RANK` in section 8 and `v_exam_results` (class rank) |
| CTEs (incl. recursive) | section 8 |
| Indexing | declared in `schema.sql`; section 12 |

---------------------------------------------------------------------------------------------------

## UNIT 3 - Transactions, procedural SQL & security
* **ACID**
  * *Atomicity*: saving a marks sheet (`markModel.saveSheet`) runs many `CALL sp_save_mark` inside one transaction - one invalid mark
    rolls back the whole sheet. Creating a student + login account is also one transaction. `sp_generate_results` uses
    `START TRANSACTION`, `SAVEPOINT`, an `EXIT HANDLER` that does `ROLLBACK TO SAVEPOINT`, and `COMMIT`.
  * *Consistency*: constraints + triggers keep every state valid (marks within range, correct class, subject taught).
  * *Isolation*: InnoDB (default REPEATABLE READ) isolates concurrent marks entry.
  * *Durability*: committed data survives restarts (InnoDB redo log).
* **Functions** (`procedures.sql`): `fn_grade`, `fn_percentage`, `fn_get_setting`.
* **Procedures**: `sp_validate_mark`, `sp_save_mark`, `sp_generate_results` (the pass/fail rule is configurable in `settings`).
* **Triggers** (`triggers.sql`): `trg_marks_bi/bu` validate marks (range, class, subject, locked exam); `trg_marks_ai/au/ad` write the audit
  trail and mark results stale; `trg_exams_bu` blocks publishing unless results exist and are fresh; `trg_students_bu` blocks changing the
  class of a student who has marks; `trg_marks_bd` protects published exams.
* **Security**
  * *Roles/privileges* (`security.sql`): `portal_admin`, `portal_teacher`, `portal_student` with least-privilege GRANTs; `portal_app` account for the API.
  * *Application RBAC*: JWT login; `requireRole()` middleware per route; teachers limited to their classes/subjects (`classScope`, `isAssignedTeacher`);
    students can only open their own **published** report card. The role is re-read from MySQL on every request.
  * *SQL-injection prevention*: every query uses placeholders (`?`) through `mysql2` prepared statements; inputs are validated (`middleware/validate.js`);
    the API test sends `' OR '1'='1` as a login and checks that it is rejected.
  * *Authentication*: bcrypt password hashes (cost 10), generic "incorrect username or password" message, constant-time compare even for
    unknown users, rate-limited login, token expiry, helmet security headers, CORS allow-list.

---------------------------------------------------------------------------------------------------

## UNIT 4 - Performance, NoSQL & real-world use
* **Indexing / EXPLAIN**: `queries.sql` section 12 (`EXPLAIN`, `EXPLAIN FORMAT=TREE`, index on/off).
* **Performance comparison**: `npm run db:benchmark` builds a 200,000-row table and times one query without and with an index.
  Result on the development machine: full scan `type=ALL`, 200,000 rows examined, **19.1 ms**; with the index `type=ref`, 10 rows, **0.48 ms** (about 39x faster).
* **Query optimisation choices**: composite unique keys `(exam, student, subject)` serve the most frequent lookups; FK indexes for joins;
  aggregation done in SQL (views/procedures), not in JavaScript; window function computes class rank in one pass.
* **NoSQL (MongoDB, optional)**: collection `report_card_snapshots`. "Save snapshot" stores the *complete* report card (JSON) exactly as issued,
  with version number and who saved it. This is a natural document use case (self-contained, schema-flexible, read as a whole, historical).
  MySQL stays the source of truth; nothing else is duplicated. Disabled automatically when `MONGODB_URI` is empty.
* **Cloud compatibility**: all connection details come from `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`,
  `MONGODB_URI`). `npm run db:setup` works against any MySQL 8 service (it reads the same variables) and the frontend API URL is `VITE_API_URL`.
