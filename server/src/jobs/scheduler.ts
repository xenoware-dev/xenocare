import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { processQueue } from '../modules/whatsapp/whatsapp.service.js';
import { runAppointmentReminders, runPaymentReminders } from './reminders.job.js';

/** Runs a job, skipping a tick if the previous run is still going. */
function guarded(name: string, fn: () => Promise<number>) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      const n = await fn();
      if (n) logger.info({ job: name, n }, 'job done');
    } catch (err) {
      logger.error({ err, job: name }, 'job failed');
    } finally {
      running = false;
    }
  };
}

export function startScheduler(timezone: string) {
  const tasks = [
    cron.schedule('* * * * *', guarded('whatsapp-queue', () => processQueue()), { timezone }),
    cron.schedule('*/15 * * * *', guarded('appointment-reminders', runAppointmentReminders), { timezone }),
    cron.schedule('0 9 * * *', guarded('payment-reminders', runPaymentReminders), { timezone }),
  ];
  logger.info('Scheduler started');
  return () => tasks.forEach((t) => t.stop());
}
