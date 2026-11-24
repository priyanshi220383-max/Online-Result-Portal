const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errors');
const { v, parse, idParam } = require('../middleware/validate');
const { notFound } = require('./crud');
const studentModel = require('../models/studentModel');

const schema = {
  admission_no: v.str('Admission number', { max: 20 }),
  full_name: v.str('Full name', { max: 100 }),
  date_of_birth: v.date('Date of birth', { optional: true }),
  gender: v.oneOf('Gender', ['Male', 'Female', 'Other']),
  class_id: v.int('Class', { min: 1 }),
  roll_no: v.int('Roll number', { min: 1, max: 9999 }),
  guardian_name: v.str('Guardian name', { max: 100, optional: true }),
  guardian_phone: v.str('Guardian phone', { max: 20, optional: true }),
  email: v.email('Email'),
};
const pw = v.password('Password', { optional: true });

exports.list = asyncHandler(async (req, res) => {
  const classId = req.query.class_id ? idParam(req.query.class_id, 'class') : null;
  const search = req.query.search ? String(req.query.search).trim().slice(0, 60) : null;
  res.json(await studentModel.list({ search, classId }, req.user));
});

exports.get = asyncHandler(async (req, res) => {
  const s = await studentModel.get(idParam(req.params.id));
  if (!s) throw notFound('Student');
  res.json(s);
});

exports.create = asyncHandler(async (req, res) => {
  const data = parse(req.body, schema);
  const password = pw(req.body?.password);
  const id = await studentModel.create(data, password ? await bcrypt.hash(password, 10) : null);
  res.status(201).json(await studentModel.get(id));
});

exports.update = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  const data = parse(req.body, schema);
  const password = pw(req.body?.password);
  const ok = await studentModel.update(id, data, password ? await bcrypt.hash(password, 10) : null);
  if (!ok) throw notFound('Student');
  res.json(await studentModel.get(id));
});

exports.remove = asyncHandler(async (req, res) => {
  if (!(await studentModel.remove(idParam(req.params.id)))) throw notFound('Student');
  res.json({ message: 'Student deleted.' });
});
