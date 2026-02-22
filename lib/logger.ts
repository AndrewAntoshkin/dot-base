/**
 * Logger with level support.
 * In production only warn and error go to console.
 * All levels are available but debug/info are suppressed in prod.
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: any[]) => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: any[]) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    }
  },

  /** For critical messages that must always appear in PM2 logs */
  critical: (...args: any[]) => {
    console.error('[CRITICAL]', ...args);
  },
};

export default logger;

