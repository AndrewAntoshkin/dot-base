/**
 * Простой logger с поддержкой уровней логирования
 * В production показывает только warn и error
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
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  
  // Для важных событий которые нужны и в production
  log: (...args: any[]) => {
    console.log(...args);
  },
};

export default logger;

