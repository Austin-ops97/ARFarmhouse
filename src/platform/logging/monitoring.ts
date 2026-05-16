/**
 * Monitoring hooks — crash reporting, analytics, moderation audit (integrations TBD).
 */

import { logger, type LogContext } from "./logger";

export type MonitoringEvent =
  | "app.boot"
  | "auth.sign_in"
  | "auth.sign_out"
  | "booking.submit"
  | "booking.approve"
  | "booking.deny"
  | "feed.post_create"
  | "feed.post_delete"
  | "media.upload_start"
  | "media.upload_complete"
  | "media.upload_fail"
  | "moderation.action"
  | "offline.queue_flush"
  | "offline.reconnect";

type EventHandler = (event: MonitoringEvent, context?: LogContext) => void;

const handlers: EventHandler[] = [];

export function onMonitoringEvent(handler: EventHandler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function trackEvent(event: MonitoringEvent, context?: LogContext): void {
  logger.debug(`track:${event}`, context);
  for (const h of handlers) {
    try {
      h(event, context);
    } catch {
      /* non-fatal */
    }
  }
}

export function captureException(error: unknown, context?: LogContext): void {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message, {
    ...context,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

/** Future: Sentry.init({ dsn }) → registerLogSink + onMonitoringEvent */
export function prepareMonitoringIntegrations(): void {
  if (process.env.NODE_ENV === "development") {
    logger.info("Monitoring integrations ready (no external sinks configured)");
  }
}
