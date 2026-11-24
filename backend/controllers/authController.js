const bcrypt = require('bcryptjs');
const { HttpError, asyncHandler } = require('../middleware/errors');
const { v, parse } = require('../middleware/validate');
const { signToken } = require('../middleware/auth');
const userModel = require('../models/userModel');

// Compared against when the username does not exist, so response time does not reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicUser = (u) => ({
  id: u.user_id ?? u.id, username: u.username, role: u.role,
  displayName: u.display_name ?? u.displayName,
  studentId: u.student_id ?? u.studentId ?? null,
  teacherId: u.teacher_id ?? u.teacherId ?? null,
});

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = parse(req.body, {
    username: v.str('Username', { max: 50 }),
    password: v.str('Password', { max: 72 }),
  });
  const user = await userModel.findByUsername(username);          // parameterised query
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok || !user.is_active) throw new HttpError(401, 'Incorrect username or password.');
  res.json({ token: signToken(user), user: publicUser(user) });
});

exports.me = (req, res) => res.json({ user: publicUser(req.user) });

exports.changePassword = asyncHandler(async (req, res) => {
  const body = parse(req.body, {
    currentPassword: v.str('Current password', { max: 72 }),
    newPassword: v.password('New password'),
  });
  const user = await userModel.findById(req.user.id);
  if (!(await bcrypt.compare(body.currentPassword, user.password_hash))) {
    throw new HttpError(400, 'Current password is incorrect.');
  }
  await userModel.updatePassword(req.user.id, await bcrypt.hash(body.newPassword, 10));
  res.json({ message: 'Password updated.' });
});
