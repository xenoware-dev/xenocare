import { pino } from 'pino';
import { isProd } from '../config/env.js';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});
