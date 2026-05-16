/**
 * Production logging facade — wire Sentry / Firebase Analytics / LogRocket here later.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LogSink = (level: LogLevel, message: string, context?: LogContext) => void;

const sinks: LogSink[] = [];

let minLevel: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setMinLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function registerLogSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;
  const payload = context ? { ...context } : undefined;
  for (const sink of sinks) {
    try {
      sink(level, message, payload);
    } catch {
      /* sink must not break app */
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const fn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "debug"
            ? console.debug
            : console.info;
    fn(`[${level}]`, message, payload ?? "");
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
