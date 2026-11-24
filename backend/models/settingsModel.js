const { query, withTransaction } = require('../config/db');

const getAll = async () => {
  const rows = await query('SELECT setting_key, setting_value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
};

const save = (values) =>
  withTransaction(async (conn) => {
    for (const [key, value] of Object.entries(values)) {
      await conn.execute(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(value)],
      );
    }
  });

const grades = () => query('SELECT grade, min_percentage FROM grade_scale ORDER BY min_percentage DESC');

/** Replaces the whole grade scale atomically. Rolled back if the database rejects any row. */
const replaceGrades = (bands) =>
  withTransaction(async (conn) => {
    await conn.execute('DELETE FROM grade_scale');
    for (const b of bands) {
      await conn.execute('INSERT INTO grade_scale (grade, min_percentage) VALUES (?, ?)', [b.grade, b.min_percentage]);
    }
  });

module.exports = { getAll, save, grades, replaceGrades };
