const { asyncHandler } = require('../middleware/errors');
const { v, parse, idParam } = require('../middleware/validate');
const { notFound } = require('./crud');
const examModel = require('../models/examModel');

const schema = {
  exam_name: v.str('Examination name', { max: 80 }),
  class_id: v.int('Class', { min: 1 }),
  exam_date: v.date('Exam date', { optional: true }),
};

exports.list = asyncHandler(async (req, res) => res.json(await examModel.list(req.user)));

exports.create = asyncHandler(async (req, res) => {
  const id = await examModel.create(parse(req.body, schema));
  res.status(201).json(await examModel.get(id));
});

exports.update = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  await examModel.update(id, parse(req.body, schema));
  res.json(await examModel.get(id));
});

exports.publish = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  const { publish } = parse(req.body, { publish: v.bool('publish') });
  if (!(await examModel.get(id))) throw notFound('Examination');
  await examModel.setPublished(id, publish);          // trigger may refuse with a readable message
  res.json({ message: publish ? 'Examination published.' : 'Examination unpublished.' });
});

exports.remove = asyncHandler(async (req, res) => {
  await examModel.remove(idParam(req.params.id));
  res.json({ message: 'Examination deleted.' });
});
