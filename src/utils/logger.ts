interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  level: string;
  timestamp: string;
  message: string;
  service: string;
  environment: string;
  correlationId?: string;
  requestId?: string;
  duration?: number;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
  metadata?: LogMetadata;
}

class Logger {
  private readonly service: string;
  private readonly environment: string;

  constructor() {
    this.service = Deno.env.get("SERVICE_NAME") || "skygrep";
    this.environment = Deno.env.get("ENVIRONMENT") || "development";
  }

  private createLogEntry(
    level: string,
    message: string,
    metadata?: LogMetadata,
    error?: Error,
  ): LogEntry {
    const logEntry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      service: this.service,
      environment: this.environment,
    };

    if (metadata?.correlationId) {
      logEntry.correlationId = metadata.correlationId as string;
      delete metadata.correlationId;
    }

    if (metadata?.requestId) {
      logEntry.requestId = metadata.requestId as string;
      delete metadata.requestId;
    }

    if (metadata?.duration) {
      logEntry.duration = metadata.duration as number;
      delete metadata.duration;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.environment === "development" ? error.stack : undefined,
      };
    }

    if (metadata && Object.keys(metadata).length > 0) {
      logEntry.metadata = metadata;
    }

    return logEntry;
  }

  info(message: string, metadata?: LogMetadata): void {
    const logEntry = this.createLogEntry("info", message, metadata);
    console.log(JSON.stringify(logEntry));
  }

  warn(message: string, metadata?: LogMetadata): void {
    const logEntry = this.createLogEntry("warn", message, metadata);
    console.warn(JSON.stringify(logEntry));
  }

  error(message: string, metadata?: LogMetadata, error?: Error): void {
    const logEntry = this.createLogEntry("error", message, metadata, error);
    console.error(JSON.stringify(logEntry));
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.environment === "development") {
      const logEntry = this.createLogEntry("debug", message, metadata);
      console.debug(JSON.stringify(logEntry));
    }
  }
}

export const logger = new Logger();
