// Loads the single root-level .env file and exposes validated settings.
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';
const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

const env = {
  isProd,
  port: Number(process.env.PORT || 5000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',').map((s) => s.trim()).filter(Boolean),
  serveFrontend: bool(process.env.SERVE_FRONTEND, false),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'result_portal',
    ssl: bool(process.env.DB_SSL, false),
    sslRejectUnauthorized: bool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  },

  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  mongoUri: process.env.MONGODB_URI || '',
  mongoDb: process.env.MONGODB_DB || 'result_portal',
};

if (isProd && (env.jwtSecret === 'dev-only-secret-change-me' || env.jwtSecret.length < 24)) {
  throw new Error('JWT_SECRET must be set to a long random value (24+ chars) in production.');
}

module.exports = env;
