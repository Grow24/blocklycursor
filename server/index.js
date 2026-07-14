/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: AC-REQ-SALES-001-1
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import requirementsRouter from './routes/requirements.js';
import leadsRouter from './routes/leads.js';
import tasksRouter from './routes/tasks.js';
import notificationsRouter from './routes/notifications.js';
import auditRouter from './routes/audit.js';
import usersRouter from './routes/users.js';
import cursorRouter from './routes/cursor.js';
import { seedDefaults } from './lib/data-store.js';
import { RULE_CONFIG } from './lib/rule-engine.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load key=value pairs from repo-root .env without adding a dependency. */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, '..', '.env'));

const app = express();
const PORT = process.env.PORT || 3000;
const clientDist = join(__dirname, '..', 'client', 'dist');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

seedDefaults();

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'pbmp-blockly',
    env: process.env.NODE_ENV || 'development',
    modules: {
      discovery: 'active',
      lead_management: 'active',
    },
    rule: RULE_CONFIG,
  });
});

app.use('/api/requirements', requirementsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/users', usersRouter);
app.use('/api/cursor', cursorRouter);

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const leadsPage = join(clientDist, 'leads.html');
    if (req.path === '/leads' && existsSync(leadsPage)) {
      return res.sendFile(leadsPage);
    }
    return res.sendFile(join(clientDist, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`PBMP server running on http://localhost:${PORT}`);
    console.log(`Lead Management: http://localhost:${PORT}/leads`);
    if (!existsSync(clientDist)) {
      console.log('Client not built yet. Run: npm run dev (or npm run build)');
    }
  });
}

export default app;
