// Shared helpers for controllers.
const { HttpError } = require('../middleware/errors');
const examModel = require('../models/examModel');

const notFound = (what) => new HttpError(404, `${what} not found.`);

/** Loads an exam and checks that the signed-in user may work with it. */
async function loadExamForStaff(user, examId) {
  const exam = await examModel.get(examId);
  if (!exam) throw notFound('Examination');
  if (user.role === 'teacher' && !(await examModel.teacherCanAccess(user.teacherId, examId))) {
    throw new HttpError(403, 'You do not teach any subject in this examination\'s class.');
  }
  return exam;
}

module.exports = { notFound, loadExamForStaff };
