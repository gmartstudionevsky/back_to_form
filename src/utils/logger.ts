type LogPayload = Record<string, unknown> | undefined;

const DEBUG_FLAG_KEY = 'btf-debug';

const canUseLocalStorage = () => typeof window !== 'undefined' && 'localStorage' in window;

const isLoggingEnabled = () => {
  if (import.meta.env.DEV) return true;
  if (!canUseLocalStorage()) return false;
  try {
    return window.localStorage.getItem(DEBUG_FLAG_KEY) === '1';
  } catch {
    return false;
  }
};

const logWith = (
  level: 'info' | 'warn' | 'error',
  message: string,
  payload?: LogPayload
) => {
  if (!isLoggingEnabled()) return;
  const prefix = '[BTF]';
  if (payload) {
    console[level](`${prefix} ${message}`, payload);
  } else {
    console[level](`${prefix} ${message}`);
  }
};

export const logger = {
  info: (message: string, payload?: LogPayload) => logWith('info', message, payload),
  warn: (message: string, payload?: LogPayload) => logWith('warn', message, payload),
  error: (message: string, payload?: LogPayload) => logWith('error', message, payload)
};
