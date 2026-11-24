// Authentication (JWT) and role-based authorisation.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const { HttpError, asyncHandler } = require('./errors');

function signToken(user) {
  return jwt.sign({ sub: user.user_id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });
}

/** Verifies the Bearer token, then re-loads the user from MySQL so that role changes
 *  and deactivated accounts take effect immediately. Sets req.user. */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please sign in.');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }

  const rows = await query(
    `SELECT u.user_id, u.username, u.role, u.is_active,
            t.teacher_id, s.student_id,
            COALESCE(t.full_name, s.full_name, 'Administrator') AS display_name
       FROM users u
       LEFT JOIN teachers t ON t.user_id = u.user_id
       LEFT JOIN students s ON s.user_id = u.user_id
      WHERE u.user_id = ?`,
    [payload.sub],
  );
  const user = rows[0];
  if (!user || !user.is_active) throw new HttpError(401, 'Account not found or disabled.');
  req.user = {
    id: user.user_id,
    username: user.username,
    role: user.role,
    teacherId: user.teacher_id,
    studentId: user.student_id,
    displayName: user.display_name,
  };
  next();
});

/** requireRole('admin', 'teacher') -> 403 for any other role. */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, 'You do not have permission to do that.'));
  }
  return next();
};

/** SQL fragment limiting rows to the classes a teacher teaches (admin: no limit).
 *  Usage: const s = classScope(req.user, 'e.class_id'); `... WHERE ${s.sql}`, [...s.params] */
function classScope(user, column) {
  if (user.role === 'admin') return { sql: '1=1', params: [] };
  return {
    sql: `${column} IN (SELECT class_id FROM teaching_assignments WHERE teacher_id = ?)`,
    params: [user.teacherId ?? 0],
  };
}

module.exports = { signToken, authenticate, requireRole, classScope };
