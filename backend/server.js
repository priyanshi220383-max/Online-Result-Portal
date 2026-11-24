const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { pool } = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
if (env.isProd) app.set('trust proxy', 1);           // correct client IPs behind a hosting proxy

app.use(helmet({ contentSecurityPolicy: false }));  // CSP off so the built SPA's fonts/images load
app.use(cors({
  origin(origin, cb) {
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '200kb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api', routes);
app.use('/api', notFound);

// Optional single-server deployment: serve the built React app from Express.
const dist = path.resolve(__dirname, '../frontend/dist');
if (env.serveFrontend && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log(`MySQL connected (${env.db.host}:${env.db.port}/${env.db.database})`);
  } catch (err) {
    console.error(`\nCould not connect to MySQL: ${err.message}`);
    console.error('Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in .env and run "npm run db:setup".\n');
  }
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}/api`));
}

if (require.main === module) start();
module.exports = app;
