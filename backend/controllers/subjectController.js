const { HttpError, asyncHandler } = require('../middleware/errors');
const { v, parse, idParam } = require('../middleware/validate');
const subjectModel = require('../models/subjectModel');

const schema = {
  subject_code: v.str('Subject code', { max: 10 }),
  subject_name: v.str('Subject name', { max: 80 }),
  max_marks: v.int('Maximum marks', { min: 1, max: 1000 }),
  pass_marks: v.int('Passing marks', { min: 0, max: 1000 }),
};
function parseSubject(body) {
  const d = parse(body, schema);
  d.subject_code = d.subject_code.toUpperCase();
  if (d.pass_marks > d.max_marks) throw new HttpError(400, 'Passing marks cannot be greater than maximum marks.');
  return d;
}

exports.list = asyncHandler(async (req, res) => res.json(await subjectModel.list()));

exports.create = asyncHandler(async (req, res) => {
  const id = await subjectModel.create(parseSubject(req.body));
  res.status(201).json({ subject_id: id });
});

exports.update = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  const d = parseSubject(req.body);
  if ((await subjectModel.marksAbove(id, d.max_marks)) > 0) {
    throw new HttpError(409, 'Some stored marks are higher than this new maximum. Correct those marks first.');
  }
  await subjectModel.update(id, d);
  res.json({ message: 'Subject updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  await subjectModel.remove(idParam(req.params.id));
  res.json({ message: 'Subject deleted.' });
});
