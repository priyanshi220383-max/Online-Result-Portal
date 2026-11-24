/*
 * UNIT 4 - indexing / query-optimisation demo.   npm run db:benchmark
 * Builds a temporary table `marks_bench` with 200,000 rows (not touching real data),
 * times the same query WITHOUT and WITH an index, prints the EXPLAIN plans, then drops the table.
 */
const mysql = require('mysql2/promise');
const { connectionOptions } = require('../config/db');

const ROWS = 200000;
const QUERY = 'SELECT COUNT(*) AS n, ROUND(AVG(marks_obtained), 2) AS average FROM marks_bench WHERE student_id = ?';

async function time(conn, label, runs = 30) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < runs; i += 1) await conn.execute(QUERY, [1000 + i]);
  const ms = Number(process.hrtime.bigint() - start) / 1e6 / runs;
  console.log(`  ${label}: ${ms.toFixed(2)} ms per query (avg of ${runs})`);
  return ms;
}

async function plan(conn, label) {
  const [rows] = await conn.query(`EXPLAIN ${QUERY.replace('?', '1000')}`);
  const r = rows[0];
  console.log(`  EXPLAIN (${label}): type=${r.type}, key=${r.key}, rows examined=${r.rows}`);
}

(async () => {
  const conn = await mysql.createConnection(connectionOptions(true));
  try {
    console.log(`Creating marks_bench with ${ROWS.toLocaleString()} rows ...`);
    await conn.query('DROP TABLE IF EXISTS marks_bench');
    await conn.query('CREATE TABLE marks_bench (id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, subject_id INT NOT NULL, exam_id INT NOT NULL, marks_obtained DECIMAL(5,2) NOT NULL)');
    await conn.query('SET SESSION cte_max_recursion_depth = 1000000');
    await conn.query(
      `INSERT INTO marks_bench (student_id, subject_id, exam_id, marks_obtained)
       WITH RECURSIVE seq AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < ${ROWS})
       SELECT MOD(n, 20000) + 1, MOD(n, 6) + 1, MOD(n, 5) + 1, MOD(n * 37, 100) FROM seq`);

    console.log('\nWITHOUT index on student_id (full table scan):');
    await plan(conn, 'no index');
    const slow = await time(conn, 'timing');

    await conn.query('CREATE INDEX idx_bench_student ON marks_bench (student_id)');
    console.log('\nWITH index idx_bench_student(student_id):');
    await plan(conn, 'indexed');
    const fast = await time(conn, 'timing');

    console.log(`\nResult: the index made this lookup about ${(slow / fast).toFixed(0)}x faster.`);
  } finally {
    await conn.query('DROP TABLE IF EXISTS marks_bench');
    await conn.end();
  }
})().catch((e) => { console.error('Benchmark failed:', e.message); process.exit(1); });
