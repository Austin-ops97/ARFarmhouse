/** Dev-only action tracing for feed/booking flows. */
export function actionDebug(scope: string, message: string, detail?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (detail !== undefined) {
    console.info(`[ar:${scope}]`, message, detail);
  } else {
    console.info(`[ar:${scope}]`, message);
  }
}
