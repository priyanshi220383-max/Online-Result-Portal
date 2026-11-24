const { query } = require('../config/db');

const list = () =>
  query(`SELECT subject_id, subject_code, subject_name, max_marks, pass_marks
           FROM subjects ORDER BY subject_name`);

const create = async (d) =>
  (await query('INSERT INTO subjects (subject_code, subject_name, max_marks, pass_marks) VALUES (?, ?, ?, ?)',
    [d.subject_code, d.subject_name, d.max_marks, d.pass_marks])).insertId;

/** Marks already stored above a new (lower) maximum would become invalid. */
const marksAbove = async (id, max) =>
  (await query('SELECT COUNT(*) AS n FROM marks WHERE subject_id = ? AND marks_obtained > ?', [id, max]))[0].n;

const update = (id, d) =>
  query('UPDATE subjects SET subject_code = ?, subject_name = ?, max_marks = ?, pass_marks = ? WHERE subject_id = ?',
    [d.subject_code, d.subject_name, d.max_marks, d.pass_marks, id]);

const remove = (id) => query('DELETE FROM subjects WHERE subject_id = ?', [id]);

module.exports = { list, create, marksAbove, update, remove };
