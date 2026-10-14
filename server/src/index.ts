import { createApp } from './app.js';
import { env } from './config/env.js';
import { startScheduler } from './jobs/scheduler.js';
import { logger } from './lib/logger.js';
import { getOrgSettings } from './lib/org.js';

const app = createApp();
const server = app.listen(env.PORT, () => logger.info(`API listening on http://localhost:${env.PORT}`));

let stopScheduler: (() => void) | undefined;
if (env.CRON_ENABLED) {
  getOrgSettings()
    .then(({ timezone }) => (stopScheduler = startScheduler(timezone)))
    .catch((err) => logger.error({ err }, 'Could not start scheduler'));
}

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  stopScheduler?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
