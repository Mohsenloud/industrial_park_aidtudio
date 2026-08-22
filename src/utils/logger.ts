import fs from "fs";
import path from "path";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO" | "DEBUG";
  context: string;
  message: string;
  errorCode?: string;
  details?: any;
  stack?: string;
}

const MAX_LOGS_IN_MEMORY = 300;
const memoryLogs: LogEntry[] = [];
const LOG_FILE_PATH = path.join("/tmp", "app_system_logs.log");

function appendToFile(entry: LogEntry) {
  try {
    const formatted = `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message} ${
      entry.errorCode ? `(Code: ${entry.errorCode})` : ""
    } ${entry.details ? JSON.stringify(entry.details) : ""} ${entry.stack ? `\nStack: ${entry.stack}` : ""}\n`;
    
    fs.appendFileSync(LOG_FILE_PATH, formatted, { encoding: "utf8" });
  } catch (err) {
    // Non-blocking fallback to stderr if file system in restricted container fails
    console.error("[Logger File Write Error]:", err);
  }
}

export const logger = {
  error: (context: string, message: string, error?: any, details?: any) => {
    const timestamp = new Date().toISOString();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    let stack: string | undefined;
    let errorCode: string | undefined;

    if (error) {
      if (error instanceof Error) {
        stack = error.stack;
        errorCode = (error as any).code || error.name;
        if (!message) message = error.message;
      } else if (typeof error === "object") {
        errorCode = error.code || error.status;
        details = { ...details, rawError: error };
      } else if (typeof error === "string") {
        details = { ...details, rawErrorString: error };
      }
    }

    const entry: LogEntry = {
      id,
      timestamp,
      level: "ERROR",
      context,
      message,
      errorCode,
      details,
      stack,
    };

    memoryLogs.unshift(entry);
    if (memoryLogs.length > MAX_LOGS_IN_MEMORY) {
      memoryLogs.pop();
    }

    console.error(`[ERROR] [${context}] ${message}`, details || "", stack || "");
    appendToFile(entry);
    return entry;
  },

  warn: (context: string, message: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entry: LogEntry = {
      id,
      timestamp,
      level: "WARN",
      context,
      message,
      details,
    };

    memoryLogs.unshift(entry);
    if (memoryLogs.length > MAX_LOGS_IN_MEMORY) {
      memoryLogs.pop();
    }

    console.warn(`[WARN] [${context}] ${message}`, details || "");
    appendToFile(entry);
    return entry;
  },

  info: (context: string, message: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entry: LogEntry = {
      id,
      timestamp,
      level: "INFO",
      context,
      message,
      details,
    };

    memoryLogs.unshift(entry);
    if (memoryLogs.length > MAX_LOGS_IN_MEMORY) {
      memoryLogs.pop();
    }

    console.log(`[INFO] [${context}] ${message}`, details || "");
    appendToFile(entry);
    return entry;
  },

  getLogs: (limit = 100, level?: string): LogEntry[] => {
    let filtered = memoryLogs;
    if (level && level !== "ALL") {
      filtered = memoryLogs.filter((l) => l.level === level.toUpperCase());
    }
    return filtered.slice(0, limit);
  },

  getRawLogText: (): string => {
    try {
      if (fs.existsSync(LOG_FILE_PATH)) {
        return fs.readFileSync(LOG_FILE_PATH, "utf8");
      }
    } catch (err) {
      console.warn("Could not read log file, returning memory logs:", err);
    }

    return memoryLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level}] [${l.context}] ${l.message} ${
            l.details ? JSON.stringify(l.details) : ""
          } ${l.stack ? `\nStack: ${l.stack}` : ""}`
      )
      .join("\n");
  },

  clearLogs: () => {
    memoryLogs.length = 0;
    try {
      if (fs.existsSync(LOG_FILE_PATH)) {
        fs.writeFileSync(LOG_FILE_PATH, "", "utf8");
      }
    } catch (err) {
      console.error("Failed to truncate log file:", err);
    }
  },
};
