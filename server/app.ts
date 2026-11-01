import fs from 'node:fs';
import path from 'node:path';
import express, { type ErrorRequestHandler } from 'express';
import { api, HttpError } from './api.ts';
import { seed } from './seed.ts';

const DIST_DIR = path.join(import.meta.dirname, '..', 'dist');

const handleErrors: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : err?.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server' : err.message });
};

export function createApp() {
  seed();

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', api);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Serve the built web app (npm run build) with client-side routing.
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.use((req, res, next) => {
      if (req.method === 'GET') res.sendFile(path.join(DIST_DIR, 'index.html'));
      else next();
    });
  }

  app.use(handleErrors);
  return app;
}
