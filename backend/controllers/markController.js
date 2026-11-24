const { HttpError, asyncHandler } = require('../middleware/errors');
const { idParam } = require('../middleware/validate');
const { loadExamForStaff } = require('./crud');
const markModel = require('../models/markModel');
const subjectModel = require('../models/subjectModel');

exports.options = asyncHandler(async (req, res) => res.json(await markModel.options(req.user)));

async function authorise(user, examId, subjectId) {
  const exam = await loadExamForStaff(user, examId);
  if (user.role === 'teacher' && !(await markModel.isAssignedTeacher(user.teacherId, examId, subjectId))) {
    throw new HttpError(403, 'You are not assigned to teach this subject in this class.');
  }
  return exam;
}

exports.sheet = asyncHandler(async (req, res) => {
  const examId = idParam(req.query.exam_id, 'exam');
  const subjectId = idParam(req.query.subject_id, 'subject');
  const exam = await authorise(req.user, examId, subjectId);
  const subject = (await subjectModel.list()).find((s) => s.subject_id === subjectId);
  if (!subject) throw new HttpError(404, 'Subject not found.');
  res.json({ exam, subject, students: await markModel.sheet(examId, subjectId) });
});

exports.saveSheet = asyncHandler(async (req, res) => {
  const examId = idParam(req.body?.exam_id, 'exam');
  const subjectId = idParam(req.body?.subject_id, 'subject');
  await authorise(req.user, examId, subjectId);
  const raw = Array.isArray(req.body?.entries) ? req.body.entries : null;
  if (!raw || raw.length === 0 || raw.length > 500) throw new HttpError(400, 'Send between 1 and 500 mark entries.');

  const entries = [];
  for (const e of raw) {
    if (e.marks_obtained === '' || e.marks_obtained === null || e.marks_obtained === undefined) continue; // blank = not entered
    const marks = Number(e.marks_obtained);
    if (!Number.isFinite(marks)) throw new HttpError(400, 'Marks must be numbers.');
    entries.push({ student_id: idParam(e.student_id, 'student'), marks_obtained: marks });
  }
  if (entries.length === 0) throw new HttpError(400, 'No marks were entered.');

  const saved = await markModel.saveSheet(examId, subjectId, entries, req.user.id, HttpError);
  res.json({ message: `${saved} mark(s) saved.`, saved });
});

exports.audit = asyncHandler(async (req, res) => {
  const examId = req.query.exam_id ? idParam(req.query.exam_id, 'exam') : null;
  res.json(await markModel.audit(req.user, examId));
});
