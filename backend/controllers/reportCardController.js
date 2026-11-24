const { HttpError, asyncHandler } = require('../middleware/errors');
const { idParam } = require('../middleware/validate');
const { loadExamForStaff } = require('./crud');
const reportCardModel = require('../models/reportCardModel');
const { mongoEnabled, getSnapshotCollection } = require('../config/mongo');
const { ObjectId } = require('mongodb');

/** Loads the report card and enforces who may see it. */
async function loadCard(req) {
  const examId = idParam(req.params.examId, 'exam');
  const studentId = idParam(req.params.studentId, 'student');

  if (req.user.role === 'student') {
    if (req.user.studentId !== studentId) throw new HttpError(403, 'You can only view your own report card.');
  } else {
    await loadExamForStaff(req.user, examId);
  }

  const built = await reportCardModel.build(examId, studentId);
  if (!built) throw new HttpError(404, 'Student or examination not found for this class.');
  if (!built.result) throw new HttpError(404, 'Results have not been generated for this student yet.');
  if (req.user.role === 'student' && !built.header.is_published) {
    throw new HttpError(403, 'This report card has not been published yet.');
  }
  return built.card;
}

exports.get = asyncHandler(async (req, res) => {
  const card = await loadCard(req);
  res.json({ ...card, snapshots_enabled: mongoEnabled() });
});

// ---- MongoDB snapshots (optional, staff only) -----------------------------------------
async function collectionOr503() {
  const col = await getSnapshotCollection();
  if (!col) throw new HttpError(503, 'MongoDB is not configured or not reachable, so snapshots are unavailable.');
  return col;
}

exports.createSnapshot = asyncHandler(async (req, res) => {
  const card = await loadCard(req);
  const col = await collectionOr503();
  const last = await col.find({ student_id: card.student.student_id, exam_id: card.exam.exam_id })
    .sort({ version: -1 }).limit(1).toArray();
  const doc = {
    student_id: card.student.student_id,
    exam_id: card.exam.exam_id,
    version: (last[0]?.version || 0) + 1,
    saved_at: new Date(),
    saved_by: { user_id: req.user.id, username: req.user.username },
    snapshot: card,                       // full report card exactly as it was on this date
  };
  const r = await col.insertOne(doc);
  res.status(201).json({ id: r.insertedId, version: doc.version, saved_at: doc.saved_at });
});

exports.listSnapshots = asyncHandler(async (req, res) => {
  const studentId = idParam(req.query.student_id, 'student');
  const examId = idParam(req.query.exam_id, 'exam');
  await loadExamForStaff(req.user, examId);
  const col = await collectionOr503();
  const docs = await col.find({ student_id: studentId, exam_id: examId })
    .project({ version: 1, saved_at: 1, saved_by: 1, 'snapshot.result.percentage': 1, 'snapshot.result.grade': 1, 'snapshot.result.status': 1 })
    .sort({ version: -1 }).limit(20).toArray();
  res.json(docs);
});

exports.getSnapshot = asyncHandler(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid snapshot id.');
  const col = await collectionOr503();
  const doc = await col.findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) throw new HttpError(404, 'Snapshot not found.');
  await loadExamForStaff(req.user, doc.exam_id);
  res.json(doc);
});
