/*
 * End-to-end test of the running API + MySQL database.
 *
 *   1. npm run db:setup        (fresh sample data)
 *   2. npm run dev             (or: npm start -w backend)   - in another terminal
 *   3. npm run test:db
 *
 * It signs in as admin / teacher / student, checks role restrictions, CRUD,
 * marks validation (triggers), atomic marks saving, result generation, publishing
 * rules and report cards. It changes the sample data, so re-run `npm run db:setup`
 * afterwards if you want the pristine demo data back.
 */
const env = require('../config/env');

const BASE = process.env.TEST_API_URL || `http://localhost:${env.port}/api`;
let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name} ${detail}`); }
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

async function login(username, password = 'Password@123') {
  const r = await call('POST', '/auth/login', { body: { username, password } });
  return r.status === 200 ? r.data.token : null;
}

async function main() {
  console.log(`Testing API at ${BASE}\n`);

  console.log('Health & authentication');
  const health = await call('GET', '/health');
  check('health endpoint reports MySQL up', health.status === 200 && health.data.mysql === true);
  check('wrong password is rejected (401)', (await call('POST', '/auth/login', { body: { username: 'admin', password: 'nope' } })).status === 401);
  const inj = await call('POST', '/auth/login', { body: { username: "' OR '1'='1' -- ", password: "' OR '1'='1" } });
  check('SQL-injection login attempt is rejected (401)', inj.status === 401);
  check('request without token is rejected (401)', (await call('GET', '/students')).status === 401);
  check('forged token is rejected (401)', (await call('GET', '/students', { token: 'abc.def.ghi' })).status === 401);

  const admin = await login('admin');
  const teacher = await login('t.sharma');   // teaches Mathematics + Computer Science
  const student = await login('ADM2025001'); // Class 10-A
  check('admin, teacher and student can sign in', !!(admin && teacher && student));
  const me = await call('GET', '/auth/me', { token: student });
  check('/auth/me returns the student role', me.data?.user?.role === 'student' && me.data.user.studentId > 0);

  console.log('\nRole-based access control');
  check('student cannot list students (403)', (await call('GET', '/students', { token: student })).status === 403);
  check('student cannot open dashboard (403)', (await call('GET', '/dashboard', { token: student })).status === 403);
  check('student cannot create subjects (403)', (await call('POST', '/subjects', { token: student, body: {} })).status === 403);
  check('teacher cannot create students (403)', (await call('POST', '/students', { token: teacher, body: {} })).status === 403);
  check('teacher cannot list teachers (403)', (await call('GET', '/teachers', { token: teacher })).status === 403);
  check('teacher cannot change settings (403)', (await call('PUT', '/settings', { token: teacher, body: {} })).status === 403);
  check('teacher can read students of own classes', (await call('GET', '/students', { token: teacher })).status === 200);
  check('admin can list teachers', (await call('GET', '/teachers', { token: admin })).data?.length >= 4);

  console.log('\nDashboard');
  const dash = (await call('GET', '/dashboard', { token: admin })).data;
  check('dashboard counts come from the database', dash.counts.students === 24 && dash.counts.subjects === 6);
  check('dashboard has result statistics and toppers', dash.results.total > 0 && dash.toppers.length > 0);

  console.log('\nSubjects CRUD + validation');
  const created = await call('POST', '/subjects', { token: admin, body: { subject_code: 'tst', subject_name: 'Test Subject', max_marks: 80, pass_marks: 30 } });
  check('create subject (201)', created.status === 201);
  check('duplicate subject code is rejected (409)', (await call('POST', '/subjects', { token: admin, body: { subject_code: 'TST', subject_name: 'Dup', max_marks: 80, pass_marks: 30 } })).status === 409);
  check('passing marks above maximum is rejected (400)', (await call('POST', '/subjects', { token: admin, body: { subject_code: 'BAD', subject_name: 'Bad', max_marks: 50, pass_marks: 60 } })).status === 400);
  const subjId = created.data.subject_id;
  check('update subject', (await call('PUT', `/subjects/${subjId}`, { token: admin, body: { subject_code: 'TST', subject_name: 'Test Subject 2', max_marks: 90, pass_marks: 35 } })).status === 200);
  check('delete subject', (await call('DELETE', `/subjects/${subjId}`, { token: admin })).status === 200);

  console.log('\nClass + student CRUD (student login created in one transaction)');
  const cls = await call('POST', '/classes', { token: admin, body: { class_name: '8', section: 'Z', academic_year: '2025-26' } });
  check('create class', cls.status === 201);
  const stu = await call('POST', '/students', { token: admin, body: {
    admission_no: 'ADM-TEST-1', full_name: 'Test Student', gender: 'Female', class_id: cls.data.class_id, roll_no: 1,
    date_of_birth: '2011-01-01', guardian_name: 'Guardian', password: 'Testpass1' } });
  check('create student with login (201)', stu.status === 201 && stu.data.has_login === 1);
  check('new student can sign in', !!(await login('ADM-TEST-1', 'Testpass1')));
  check('duplicate roll number in class is rejected (409)', (await call('POST', '/students', { token: admin, body: {
    admission_no: 'ADM-TEST-2', full_name: 'Another', gender: 'Male', class_id: cls.data.class_id, roll_no: 1 } })).status === 409);
  check('invalid student payload is rejected (400)', (await call('POST', '/students', { token: admin, body: { full_name: '' } })).status === 400);
  check('weak password is rejected (400)', (await call('POST', '/students', { token: admin, body: {
    admission_no: 'ADM-TEST-3', full_name: 'Weak', gender: 'Male', class_id: cls.data.class_id, roll_no: 2, password: 'abc' } })).status === 400);
  const upd = await call('PUT', `/students/${stu.data.student_id}`, { token: admin, body: {
    admission_no: 'ADM-TEST-1', full_name: 'Test Student Renamed', gender: 'Female', class_id: cls.data.class_id, roll_no: 1 } });
  check('update student', upd.status === 200 && upd.data.full_name === 'Test Student Renamed');
  check('search students by name', (await call('GET', '/students?search=Renamed', { token: admin })).data.length === 1);
  check('cannot delete a class that still has students (409)', (await call('DELETE', `/classes/${cls.data.class_id}`, { token: admin })).status === 409);
  check('delete student', (await call('DELETE', `/students/${stu.data.student_id}`, { token: admin })).status === 200);
  check('deleted student can no longer sign in', (await login('ADM-TEST-1', 'Testpass1')) === null);
  check('delete class', (await call('DELETE', `/classes/${cls.data.class_id}`, { token: admin })).status === 200);

  console.log('\nExaminations');
  const exams = (await call('GET', '/exams', { token: admin })).data;
  const find = (name, cls_) => exams.find((e) => e.exam_name.startsWith(name) && e.class_label === cls_);
  const ut1_10A = find('Unit Test 1', '10-A');
  const hy10A = find('Half-Yearly', '10-A');
  const hy10B = find('Half-Yearly', '10-B');
  check('exam list has progress info from the view', exams.length === 5 && ut1_10A.results_generated === 8);
  const newExam = await call('POST', '/exams', { token: admin, body: { exam_name: 'Pre-Board', class_id: ut1_10A.class_id, exam_date: '2026-01-10' } });
  check('create exam', newExam.status === 201);
  check('publishing an exam without results is refused by the trigger (400)',
    (await call('PATCH', `/exams/${newExam.data.exam_id}/publish`, { token: admin, body: { publish: true } })).status === 400);
  check('delete exam', (await call('DELETE', `/exams/${newExam.data.exam_id}`, { token: admin })).status === 200);

  console.log('\nMarks entry, validation triggers and transactions');
  const opts = (await call('GET', '/marks/options', { token: teacher })).data;
  const codes = [...new Set(opts.map((o) => o.subject_code))].sort();
  check('teacher only sees own subjects (CSC, MAT)', JSON.stringify(codes) === '["CSC","MAT"]');
  const subjects = (await call('GET', '/subjects', { token: admin })).data;
  const sid = (code) => subjects.find((s) => s.subject_code === code).subject_id;
  const sheetUrl = (exam, code) => `/marks/sheet?exam_id=${exam}&subject_id=${sid(code)}`;

  check('teacher cannot open a sheet for another teacher\'s subject (403)', (await call('GET', sheetUrl(hy10B.exam_id, 'SCI'), { token: teacher })).status === 403);
  const sheet = (await call('GET', sheetUrl(hy10B.exam_id, 'MAT'), { token: teacher })).data;
  check('marks sheet lists the class students', sheet.students.length === 8 && sheet.subject.max_marks === 100);

  const putMarks = (token, exam, code, entries) => call('PUT', '/marks/sheet', { token, body: { exam_id: exam, subject_id: sid(code), entries } });
  const ok1 = await putMarks(teacher, hy10B.exam_id, 'MAT', sheet.students.map((s, i) => ({ student_id: s.student_id, marks_obtained: 50 + i })));
  check('teacher saves a full marks sheet', ok1.status === 200 && ok1.data.saved === 8);

  const first = sheet.students[0].student_id;
  const second = sheet.students[1].student_id;
  const bad = await putMarks(teacher, hy10B.exam_id, 'MAT', [{ student_id: first, marks_obtained: 99 }, { student_id: second, marks_obtained: 150 }]);
  check('marks above the maximum are rejected by the trigger (400)', bad.status === 400 && /between 0 and 100/.test(bad.data.message), JSON.stringify(bad.data));
  const after = (await call('GET', sheetUrl(hy10B.exam_id, 'MAT'), { token: teacher })).data;
  check('failed save was rolled back (ATOMICITY: first mark unchanged)', after.students[0].marks_obtained === 50);
  const csc = await putMarks(teacher, hy10B.exam_id, 'CSC', [{ student_id: first, marks_obtained: 60 }]);
  check('limit follows the subject (CSC max is 50)', csc.status === 400 && /between 0 and 50/.test(csc.data.message));
  check('negative marks are rejected (400)', (await putMarks(teacher, hy10B.exam_id, 'MAT', [{ student_id: first, marks_obtained: -5 }])).status === 400);
  const pub = await putMarks(admin, ut1_10A.exam_id, 'MAT', [{ student_id: first, marks_obtained: 70 }]);
  check('marks of a published exam cannot be changed (400)', pub.status === 400 && /published/.test(pub.data.message));
  check('teacher cannot save marks for a subject they do not teach (403)', (await putMarks(teacher, hy10B.exam_id, 'ENG', [{ student_id: first, marks_obtained: 10 }])).status === 403);
  const wrongClass = await putMarks(admin, hy10B.exam_id, 'MAT', [{ student_id: 1, marks_obtained: 40 }]);
  check('student from another class is rejected (400)', wrongClass.status === 400 && /class/.test(wrongClass.data.message));
  const audit = (await call('GET', `/marks/audit?exam_id=${hy10B.exam_id}`, { token: admin })).data;
  check('changed marks are recorded as UPDATE rows by the audit trigger',
    audit.some((a) => a.action === 'UPDATE' && a.old_marks !== a.new_marks && a.changed_by === 't.sharma'));

  console.log('\nResult generation (stored procedure)');
  const gen1 = await call('POST', '/results/generate', { token: admin, body: { exam_id: hy10B.exam_id } });
  check('incomplete marks => nobody gets a result', gen1.status === 200 && gen1.data.generated === 0 && gen1.data.incomplete === 8, JSON.stringify(gen1.data));
  for (const code of ['ENG', 'SCI', 'HIN', 'SST', 'CSC']) {
    const sh = (await call('GET', sheetUrl(hy10B.exam_id, code), { token: admin })).data;
    const max = sh.subject.max_marks;
    const r = await putMarks(admin, hy10B.exam_id, code, sh.students.map((s, i) => ({ student_id: s.student_id, marks_obtained: Math.round(max * (0.5 + i / 20)) })));
    if (r.status !== 200) check(`fill ${code}`, false, JSON.stringify(r.data));
  }
  const audit2 = (await call('GET', `/marks/audit?exam_id=${hy10B.exam_id}`, { token: admin })).data;
  check('newly entered marks are recorded as INSERT rows', audit2.some((a) => a.action === 'INSERT' && a.old_marks === null));
  const gen2 = await call('POST', '/results/generate', { token: admin, body: { exam_id: hy10B.exam_id } });
  check('all subjects present => 8 results generated', gen2.data.generated === 8 && gen2.data.incomplete === 0, JSON.stringify(gen2.data));
  const res = (await call('GET', `/results?exam_id=${hy10B.exam_id}`, { token: teacher })).data;
  check('results are ranked with a window function', res.length === 8 && res[0].class_rank === 1 && res[0].percentage >= res[7].percentage);
  const hyStudent = res[0];

  console.log('\nStale results and publishing rules');
  await putMarks(admin, hy10B.exam_id, 'ENG', [{ student_id: hyStudent.student_id, marks_obtained: 12 }]);
  const stale = (await call('GET', `/results?exam_id=${hy10B.exam_id}`, { token: admin })).data.find((r) => r.student_id === hyStudent.student_id);
  check('changing a mark flags the result as stale (trigger)', stale.is_stale === 1);
  const pubStale = await call('PATCH', `/exams/${hy10B.exam_id}/publish`, { token: admin, body: { publish: true } });
  check('stale results block publishing (400)', pubStale.status === 400 && /out of date/.test(pubStale.data.message));
  await call('POST', '/results/generate', { token: admin, body: { exam_id: hy10B.exam_id } });
  check('after regenerating, the exam can be published', (await call('PATCH', `/exams/${hy10B.exam_id}/publish`, { token: admin, body: { publish: true } })).status === 200);

  console.log('\nReport cards');
  const card = (await call('GET', `/report-cards/${hy10B.exam_id}/${hyStudent.student_id}`, { token: admin })).data;
  const sumObt = card.subjects.reduce((a, s) => a + s.marks_obtained, 0);
  const sumMax = card.subjects.reduce((a, s) => a + s.max_marks, 0);
  check('report card has all 6 subjects', card.subjects.length === 6);
  check('total = sum of subject marks', Math.abs(card.result.total_marks - sumObt) < 0.001 && card.result.max_total === sumMax);
  check('percentage = total / maximum', Math.abs(card.result.percentage - Math.round((sumObt / sumMax) * 10000) / 100) < 0.011);
  const grade = [...card.grade_scale].sort((a, b) => b.min_percentage - a.min_percentage).find((g) => card.result.percentage >= g.min_percentage).grade;
  check('grade follows the configurable grade scale', card.result.grade === grade);
  check('teacher can open report cards of own class', (await call('GET', `/report-cards/${hy10B.exam_id}/${hyStudent.student_id}`, { token: teacher })).status === 200);

  const ownStudent = await login(hyStudent.admission_no);
  check('student sees own published report card', (await call('GET', `/report-cards/${hy10B.exam_id}/${hyStudent.student_id}`, { token: ownStudent })).status === 200);
  const mine = (await call('GET', '/results/mine', { token: ownStudent })).data;
  check('/results/mine lists only the student\'s published results', mine.length >= 1 && mine.every((m) => m.exam_id));
  check('student cannot open another student\'s report card (403)', (await call('GET', `/report-cards/${ut1_10A.exam_id}/${first}`, { token: ownStudent })).status === 403);
  check('student cannot open an unpublished report card (403)', (await call('GET', `/report-cards/${hy10A.exam_id}/${first}`, { token: student })).status === 403);
  check('report card for a student of a different class gives 404', (await call('GET', `/report-cards/${hy10B.exam_id}/1`, { token: admin })).status === 404);

  console.log('\nConfigurable pass/fail rules and grade scale');
  const settings = (await call('GET', '/settings', { token: admin })).data;
  await call('PUT', '/settings', { token: admin, body: { ...settings, pass_percentage: 95 } });
  await call('POST', '/results/generate', { token: admin, body: { exam_id: ut1_10A.exam_id } });
  const strict = (await call('GET', `/results?exam_id=${ut1_10A.exam_id}`, { token: admin })).data;
  check('raising the pass percentage to 95 turns everyone to FAIL', strict.every((r) => r.status === 'FAIL'));
  await call('PUT', '/settings', { token: admin, body: { ...settings, pass_percentage: 33, require_subject_pass: false } });
  await call('POST', '/results/generate', { token: admin, body: { exam_id: ut1_10A.exam_id } });
  const lenient = (await call('GET', `/results?exam_id=${ut1_10A.exam_id}`, { token: admin })).data;
  check('turning off "pass every subject" lets the weak-subject student PASS', lenient.every((r) => r.status === 'PASS'));
  await call('PUT', '/settings', { token: admin, body: { ...settings } });
  await call('POST', '/results/generate', { token: admin, body: { exam_id: ut1_10A.exam_id } });
  const restored = (await call('GET', `/results?exam_id=${ut1_10A.exam_id}`, { token: admin })).data;
  check('restoring the rules brings the original FAIL back', restored.filter((r) => r.status === 'FAIL').length === 1);
  check('grade scale without a 0% band is rejected (400)', (await call('PUT', '/settings/grades', { token: admin, body: { grades: [{ grade: 'A', min_percentage: 50 }, { grade: 'B', min_percentage: 40 }] } })).status === 400);
  check('grade scale is unchanged after rejection', (await call('GET', '/settings', { token: admin })).data.grades.length === 7);

  console.log('\nMongoDB snapshot feature (optional)');
  const snap = await call('POST', `/report-cards/${hy10B.exam_id}/${hyStudent.student_id}/snapshot`, { token: admin });
  if (health.data.mongodb) check('snapshot saved in MongoDB (201)', snap.status === 201);
  else check('snapshot endpoint answers 503 when MongoDB is not configured', snap.status === 503);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('\nTest run crashed:', err.message);
  console.error('Is the API running (npm run dev) and the database set up (npm run db:setup)?');
  process.exit(1);
});
