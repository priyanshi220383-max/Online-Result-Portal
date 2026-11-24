/*
 * Creates the database and runs the SQL files in order, using the credentials
 * in .env.  This is what `npm run db:setup` executes - no mysql command line
 * client is required (handy on Windows).
 *
 *   npm run db:setup                 schema + procedures + triggers + views + seed
 *   npm run db:setup -- --no-seed    same, without sample data
 *   npm run db:security              roles / users / privileges only (needs CREATE USER rights)
 *
 * WARNING: schema.sql drops and recreates all portal tables.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');
const { connectionOptions } = require('../config/db');

const DB_DIR = path.resolve(__dirname, '../../database');
const args = process.argv.slice(2);

/** Splits a .sql file into statements. Understands the mysql client's DELIMITER command. */
function splitSql(text) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';
  for (const line of text.split(/\r?\n/)) {
    const d = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (d) { delimiter = d[1]; continue; }
    if (/^\s*--/.test(line)) continue;                 // whole-line comment
    if (buffer === '' && line.trim() === '') continue;
    buffer += line + '\n';
    if (line.trimEnd().endsWith(delimiter)) {
      const stmt = buffer.trim().slice(0, -delimiter.length).trim();
      if (stmt) statements.push(stmt);
      buffer = '';
    }
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function runFile(conn, file) {
  const sql = fs.readFileSync(path.join(DB_DIR, file), 'utf8').replace(/\bresult_portal\b/g, env.db.database);
  const statements = splitSql(sql).filter((s) => !/^(CREATE DATABASE|USE)\b/i.test(s));
  for (const [i, stmt] of statements.entries()) {
    try {
      await conn.query(stmt);
    } catch (err) {
      console.error(`\n  x ${file}, statement ${i + 1} failed:\n    ${err.message}\n    ${stmt.slice(0, 160).replace(/\s+/g, ' ')}...`);
      throw err;
    }
  }
  console.log(`  ok ${file} (${statements.length} statements)`);
}

async function main() {
  console.log(`Connecting to MySQL at ${env.db.host}:${env.db.port} as "${env.db.user}" ...`);
  const admin = await mysql.createConnection(connectionOptions(false));
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  } catch (err) {
    console.warn(`  (could not create database "${env.db.database}": ${err.message} - assuming it already exists)`);
  }
  await admin.end();

  const conn = await mysql.createConnection(connectionOptions(true));
  try {
    if (args.includes('--security')) {
      console.log('Applying roles and privileges ...');
      await runFile(conn, 'security.sql');
    } else {
      console.log(`Building database "${env.db.database}" ...`);
      for (const f of ['schema.sql', 'procedures.sql', 'triggers.sql', 'views.sql']) await runFile(conn, f);
      if (!args.includes('--no-seed')) await runFile(conn, 'seed.sql');
      const [[c]] = await conn.query(
        'SELECT (SELECT COUNT(*) FROM students) students, (SELECT COUNT(*) FROM subjects) subjects, ' +
        '(SELECT COUNT(*) FROM exams) exams, (SELECT COUNT(*) FROM marks) marks, (SELECT COUNT(*) FROM results) results');
      console.log(`\nDone. Rows: ${c.students} students, ${c.subjects} subjects, ${c.exams} exams, ${c.marks} marks, ${c.results} results.`);
      if (!args.includes('--no-seed')) {
        console.log('Demo logins (password for all: Password@123): admin | t.sharma (teacher) | ADM2025001 (student)');
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`\nDatabase setup failed: ${err.message}`);
  if (err.code === 'ECONNREFUSED') console.error('MySQL is not running or DB_HOST / DB_PORT in .env are wrong.');
  if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('Wrong DB_USER / DB_PASSWORD in .env.');
  process.exit(1);
});
