export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEvent {
  ts: string
  level: LogLevel
  component: string
  message: string
  data?: Record<string, unknown>
}

const sinks: Array<(event: LogEvent) => void> = [
  (event) => {
    const payload = event.data ? ` ${JSON.stringify(event.data)}` : ""
    const line = `[${event.ts}] ${event.level.toUpperCase()} ${event.component}: ${event.message}${payload}`
    if (event.level === "error") console.error(line)
    else if (event.level === "warn") console.warn(line)
    else console.log(line)
  },
]

export function log(level: LogLevel, component: string, message: string, data?: Record<string, unknown>) {
  const event: LogEvent = {
    ts: new Date().toISOString(),
    level,
    component,
    message,
    data,
  }
  for (const sink of sinks) sink(event)
}

export function createLogger(component: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log("debug", component, message, data),
    info: (message: string, data?: Record<string, unknown>) => log("info", component, message, data),
    warn: (message: string, data?: Record<string, unknown>) => log("warn", component, message, data),
    error: (message: string, data?: Record<string, unknown>) => log("error", component, message, data),
  }
}
