// Database configuration — MySQL connection pool
// TODO: switch to connection pooling with limits before scaling
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hellcorp',
  password: process.env.DB_PASS || 'h3llc0rp_db_p4ss',
  database: process.env.DB_NAME || 'hellcorp',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  // VULNERABLE: multipleStatements enables stacked queries
  multipleStatements: true,
  // Return dates as strings for consistency
  dateStrings: true
});

// Promisified version for async/await
const promisePool = pool.promise();

// Quick health check
pool.getConnection((err, conn) => {
  if (err) {
    console.error('[DB] MySQL connection failed:', err.message);
  } else {
    console.log('[DB] MySQL connected successfully');
    conn.release();
  }
});

module.exports = { pool, promisePool };
