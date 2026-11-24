const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errors');
const { v, parse, idParam } = require('../middleware/validate');
const teacherModel = require('../models/teacherModel');

const schema = {
  employee_code: v.str('Employee code', { max: 20 }),
  full_name: v.str('Full name', { max: 100 }),
  email: v.email('Email'),
  department: v.str('Department', { max: 60, optional: true }),
};

exports.list = asyncHandler(async (req, res) => res.json(await teacherModel.list()));

exports.create = asyncHandler(async (req, res) => {
  const d = parse(req.body, {
    ...schema,
    username: v.str('Username', { min: 3, max: 50 }),
    password: v.password('Password'),
  });
  const id = await teacherModel.create(d, await bcrypt.hash(d.password, 10));
  res.status(201).json({ teacher_id: id });
});

exports.update = asyncHandler(async (req, res) => {
  const id = idParam(req.params.id);
  await teacherModel.update(id, parse(req.body, schema));
  if (typeof req.body.is_active === 'boolean') await teacherModel.setActive(id, req.body.is_active);
  res.json({ message: 'Teacher updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  await teacherModel.remove(idParam(req.params.id));
  res.json({ message: 'Teacher deleted.' });
});
