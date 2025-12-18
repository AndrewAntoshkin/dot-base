/**
 * Client-side debug logger
 * Автоматически отключается в production
 * 
 * Использование:
 * import { debug } from '@/lib/debug';
 * debug.log('[MyComponent]', 'some message', data);
 */

const isDev = process.env.NODE_ENV !== 'production';

export const debug = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  
  error: (...args: any[]) => {
    // Errors показываем всегда
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  
  // Группировка логов
  group: (label: string) => {
    if (isDev) console.group(label);
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
  
  // Для измерения времени
  time: (label: string) => {
    if (isDev) console.time(label);
  },
  
  timeEnd: (label: string) => {
    if (isDev) console.timeEnd(label);
  },
};

export default debug;
