// MySQL connection pool. Works with a local MySQL server or any cloud MySQL
// (AWS RDS, Aiven, Railway, Azure ...) purely through the .env values.
const mysql = require('mysql2/promise');
const env = require('./env');

function connectionOptions(withDatabase = true) {
  const o = {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    dateStrings: true,      // DATE/TIMESTAMP come back as plain strings (no timezone shifts)
    decimalNumbers: true,   // DECIMAL columns come back as JS numbers
  };
  if (withDatabase) o.database = env.db.database;
  if (env.db.ssl) o.ssl = { rejectUnauthorized: env.db.sslRejectUnauthorized };
  return o;
}

const pool = mysql.createPool({
  ...connectionOptions(true),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const clean = (params) => params.map((p) => (p === undefined ? null : p));

/** Parameterised query - values are ALWAYS passed separately from the SQL text. */
async function query(sql, params = [], conn = pool) {
  const [rows] = await conn.execute(sql, clean(params));
  return rows;
}

/** Runs fn(conn) inside a transaction: COMMIT on success, ROLLBACK on any error. */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction, connectionOptions };
