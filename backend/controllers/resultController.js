const { HttpError, asyncHandler } = require('../middleware/errors');
const { idParam } = require('../middleware/validate');
const { loadExamForStaff } = require('./crud');
const resultModel = require('../models/resultModel');

exports.generate = asyncHandler(async (req, res) => {
  const examId = idParam(req.body?.exam_id, 'exam');
  await loadExamForStaff(req.user, examId);
  const out = await resultModel.generate(examId);           // CALL sp_generate_results(?)
  res.json({
    generated: out.generated_count,
    incomplete: out.incomplete_count,
    message: `Results generated for ${out.generated_count} student(s).` +
      (out.incomplete_count ? ` ${out.incomplete_count} student(s) skipped because some subject marks are missing.` : ''),
  });
});

exports.list = asyncHandler(async (req, res) => {
  const examId = idParam(req.query.exam_id, 'exam');
  await loadExamForStaff(req.user, examId);
  res.json(await resultModel.forExam(examId));
});

exports.mine = asyncHandler(async (req, res) => {
  if (!req.user.studentId) throw new HttpError(404, 'No student record is linked to this account.');
  res.json(await resultModel.mine(req.user.studentId));
});
