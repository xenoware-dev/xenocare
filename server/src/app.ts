import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env, isProd } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiRouter } from './routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  const supabase = new URL(env.SUPABASE_URL);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Radix / sonner / recharts set inline styles; fonts come from Google Fonts.
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', supabase.origin],
          connectSrc: ["'self'", supabase.origin, `wss://${supabase.host}`],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );
  app.use(cors({ origin: env.CLIENT_ORIGIN.split(','), credentials: true }));
  app.use(
    express.json({
      limit: '1mb',
      // keep the raw body for WhatsApp webhook signature checks
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

  app.use('/api', apiRouter);
  app.use('/api', notFound);

  // Production: the same service serves the built React app (one domain, no CORS).
  const clientDist = path.resolve(import.meta.dirname, '../../client/dist');
  if (isProd && existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1y', immutable: true }));
    // SPA fallback: any non-API route returns index.html (never cached, so new deploys load).
    app.get('/{*path}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
