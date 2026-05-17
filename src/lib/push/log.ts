type PushLogLevel = "info" | "warn" | "error";

/** Structured push/FCM logging — config warnings also emit in production. */
export function pushLog(level: PushLogLevel, message: string, detail?: Record<string, unknown>) {
  const prefix = "[ar:push]";
  const payload = detail ? { message, ...detail } : { message };
  if (level === "error") {
    console.error(prefix, payload);
    return;
  }
  if (level === "warn") {
    console.warn(prefix, payload);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(prefix, payload);
  }
}
