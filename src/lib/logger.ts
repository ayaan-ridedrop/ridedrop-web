// Structured logging + error capture for RideDrop.
//
// WHY: before this, the app only had scattered `console.error` calls, so when
// something broke for a real user there was no consistent, searchable record.
// This gives one place to log from, with levels and structured context, and a
// single `captureException` seam where a real monitoring service (Sentry,
// Logtail, etc.) can be dropped in later WITHOUT touching call sites.
//
// It has ZERO external dependencies on purpose — it can't break the build and
// works today. When you're ready for Sentry:
//   1. npm install @sentry/nextjs
//   2. set SENTRY_DSN in Netlify env
//   3. implement the one TODO in `captureException` below.
// Every existing call site keeps working unchanged.

type Level = 'debug' | 'info' | 'warn' | 'error';

type Context = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// In production only emit info+; in dev show everything. Override with LOG_LEVEL.
function minLevel(): number {
  const fromEnv = (process.env.LOG_LEVEL ?? '').toLowerCase() as Level;
  if (fromEnv in LEVELS) return LEVELS[fromEnv];
  return process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug;
}

const isProd = process.env.NODE_ENV === 'production';

function emit(level: Level, message: string, context?: Context) {
  if (LEVELS[level] < minLevel()) return;

  if (isProd) {
    // Structured single-line JSON — easy to search in Netlify function logs
    // and trivially ingestible by any log drain later.
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message,
      ...(context ? { context: safe(context) } : {}),
    });
    pick(level)(line);
  } else {
    // Readable in local dev.
    pick(level)(`[${level.toUpperCase()}] ${message}`, context ?? '');
  }
}

function pick(level: Level): (...args: unknown[]) => void {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  return console.log;
}

// Guard against circular refs / non-serialisable values blowing up logging.
function safe(context: Context): Context {
  try {
    JSON.stringify(context);
    return context;
  } catch {
    return { note: 'context not serialisable', keys: Object.keys(context) };
  }
}

export const logger = {
  debug: (message: string, context?: Context) => emit('debug', message, context),
  info: (message: string, context?: Context) => emit('info', message, context),
  warn: (message: string, context?: Context) => emit('warn', message, context),
  error: (message: string, context?: Context) => emit('error', message, context),
};

/**
 * Record an exception. Logs it always; forwards to a monitoring service when
 * one is wired up. Use this in catch blocks instead of bare console.error so
 * that turning on Sentry later is a one-line change here, not a repo-wide edit.
 */
export function captureException(err: unknown, context?: Context): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  emit('error', message, { ...context, ...(stack ? { stack } : {}) });

  // TODO(monitoring): when SENTRY_DSN is set, forward here, e.g.
  //   if (process.env.SENTRY_DSN) Sentry.captureException(err, { extra: context });
  // Kept as a no-op seam so call sites never change.
}
