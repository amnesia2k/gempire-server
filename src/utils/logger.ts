const COLORS = {
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[41m", // red background
} as const;

const RESET = "\x1b[0m";

type LogLevel = keyof typeof COLORS; // "info" | "warn" | "error" | "fatal"

function formatMessage(level: LogLevel, message: unknown): string {
  const timestamp = new Date().toISOString();
  return `${
    COLORS[level]
  }[${level.toUpperCase()}] ${timestamp}:${RESET} ${message}`;
}

export const logger = (() => {
  const log = (
    level: LogLevel,
    message: unknown,
    ...optionalParams: unknown[]
  ) => {
    const prefix = formatMessage(level, "");

    // Map our levels to real console methods
    let consoleMethod: (...args: unknown[]) => void;
    switch (level) {
      case "info":
        consoleMethod = console.info;
        break;
      case "warn":
        consoleMethod = console.warn;
        break;
      case "error":
      case "fatal": // fatal is just error + exit
        consoleMethod = console.error;
        break;
    }

    if (typeof message === "object") {
      consoleMethod(prefix, message, ...optionalParams);
    } else {
      consoleMethod(prefix, message, ...optionalParams);
    }

    if (level === "fatal") process.exit(1);
  };

  return {
    info: (msg: unknown, ...rest: unknown[]) => log("info", msg, ...rest),
    warn: (msg: unknown, ...rest: unknown[]) => log("warn", msg, ...rest),
    error: (msg: unknown, ...rest: unknown[]) => log("error", msg, ...rest),
    fatal: (msg: unknown, ...rest: unknown[]) => log("fatal", msg, ...rest),
  };
})();
