const { HttpError, asyncHandler } = require('../middleware/errors');
const { v, parse, idParam } = require('../middleware/validate');
const classModel = require('../models/classModel');

const schema = {
  class_name: v.str('Class', { max: 20 }),
  section: v.str('Section', { max: 5 }),
  academic_year: v.str('Academic year', { max: 9 }),
};

exports.list = asyncHandler(async (req, res) => res.json(await classModel.list(req.user)));

exports.create = asyncHandler(async (req, res) => {
  const id = await classModel.create(parse(req.body, schema));
  res.status(201).json({ class_id: id });
});

exports.update = asyncHandler(async (req, res) => {
  await classModel.update(idParam(req.params.id), parse(req.body, schema));
  res.json({ message: 'Class updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  await classModel.remove(idParam(req.params.id));
  res.json({ message: 'Class deleted.' });
});

exports.assignments = asyncHandler(async (req, res) =>
  res.json(await classModel.assignments(idParam(req.params.id))));

exports.assign = asyncHandler(async (req, res) => {
  const classId = idParam(req.params.id);
  const subjectId = idParam(req.params.subjectId, 'subject');
  const { teacher_id } = parse(req.body, { teacher_id: v.int('Teacher', { min: 1, optional: true }) });
  await classModel.assign(classId, subjectId, teacher_id);
  res.json({ message: 'Subject assigned to class.' });
});

exports.unassign = asyncHandler(async (req, res) => {
  const classId = idParam(req.params.id);
  const subjectId = idParam(req.params.subjectId, 'subject');
  if (await classModel.hasMarks(classId, subjectId)) {
    throw new HttpError(409, 'Marks already exist for this subject in this class, so it cannot be removed.');
  }
  await classModel.unassign(classId, subjectId);
  res.json({ message: 'Subject removed from class.' });
});
