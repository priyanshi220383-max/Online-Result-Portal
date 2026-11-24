const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, requireRole } = require('../middleware/auth');
const { mongoEnabled } = require('../config/mongo');
const { query } = require('../config/db');

const auth = require('../controllers/authController');
const dashboard = require('../controllers/dashboardController');
const students = require('../controllers/studentController');
const subjects = require('../controllers/subjectController');
const classes = require('../controllers/classController');
const teachers = require('../controllers/teacherController');
const exams = require('../controllers/examController');
const marks = require('../controllers/markController');
const results = require('../controllers/resultController');
const cards = require('../controllers/reportCardController');
const settings = require('../controllers/settingsController');

const router = express.Router();
const admin = requireRole('admin');
const staff = requireRole('admin', 'teacher');
const student = requireRole('student');

// ---- public -------------------------------------------------------------------------
router.get('/health', async (req, res) => {
  let mysql = false;
  try { await query('SELECT 1'); mysql = true; } catch { /* reported below */ }
  res.status(mysql ? 200 : 503).json({ status: mysql ? 'ok' : 'database-down', mysql, mongodb: mongoEnabled() });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});
router.post('/auth/login', loginLimiter, auth.login);

// ---- everything below needs a valid token ---------------------------------------------
router.use(authenticate);
router.get('/auth/me', auth.me);
router.post('/auth/change-password', auth.changePassword);
router.get('/settings', settings.get);
router.put('/settings', admin, settings.update);
router.put('/settings/grades', admin, settings.updateGrades);

router.get('/dashboard', staff, dashboard.summary);

router.get('/classes', staff, classes.list);
router.post('/classes', admin, classes.create);
router.put('/classes/:id', admin, classes.update);
router.delete('/classes/:id', admin, classes.remove);
router.get('/classes/:id/subjects', staff, classes.assignments);
router.put('/classes/:id/subjects/:subjectId', admin, classes.assign);
router.delete('/classes/:id/subjects/:subjectId', admin, classes.unassign);

router.get('/students', staff, students.list);
router.get('/students/:id', staff, students.get);
router.post('/students', admin, students.create);
router.put('/students/:id', admin, students.update);
router.delete('/students/:id', admin, students.remove);

router.get('/subjects', staff, subjects.list);
router.post('/subjects', admin, subjects.create);
router.put('/subjects/:id', admin, subjects.update);
router.delete('/subjects/:id', admin, subjects.remove);

router.get('/teachers', admin, teachers.list);
router.post('/teachers', admin, teachers.create);
router.put('/teachers/:id', admin, teachers.update);
router.delete('/teachers/:id', admin, teachers.remove);

router.get('/exams', staff, exams.list);
router.post('/exams', admin, exams.create);
router.put('/exams/:id', admin, exams.update);
router.patch('/exams/:id/publish', admin, exams.publish);
router.delete('/exams/:id', admin, exams.remove);

router.get('/marks/options', staff, marks.options);
router.get('/marks/sheet', staff, marks.sheet);
router.put('/marks/sheet', staff, marks.saveSheet);
router.get('/marks/audit', staff, marks.audit);

router.post('/results/generate', staff, results.generate);
router.get('/results', staff, results.list);
router.get('/results/mine', student, results.mine);

router.get('/report-cards/:examId/:studentId', cards.get);                  // staff or the student themself
router.post('/report-cards/:examId/:studentId/snapshot', staff, cards.createSnapshot);
router.get('/snapshots', staff, cards.listSnapshots);
router.get('/snapshots/:id', staff, cards.getSnapshot);

module.exports = router;
