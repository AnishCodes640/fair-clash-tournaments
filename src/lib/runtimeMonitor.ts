// Lightweight runtime monitor — logs unhandled errors and promise rejections
// so they surface in console (and any future telemetry pipeline).

export function installRuntimeMonitor() {
  if (typeof window === "undefined" || (window as any).__runtimeMonitorInstalled) return;
  (window as any).__runtimeMonitorInstalled = true;

  window.addEventListener("error", (event) => {
    console.error("[Runtime] Uncaught error:", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Runtime] Unhandled promise rejection:", {
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    });
  });
}
