import winston from "winston";

const { combine, timestamp, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp, service, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
});

const createLogger = (service: string) => {
  const isProduction = process.env.NODE_ENV === "production";

  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    defaultMeta: { service },
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), json()),
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? combine(timestamp(), json())
          : combine(timestamp({ format: "HH:mm:ss" }), colorize(), devFormat),
      }),
    ],
  });
};

// Singleton pattern for shared logger instance
const globalForLogger = globalThis as unknown as {
  logger: winston.Logger | undefined;
};

export const getLogger = (service?: string): winston.Logger => {
  const serviceName = service ?? process.env.SERVICE_NAME ?? "app";

  if (!globalForLogger.logger) {
    globalForLogger.logger = createLogger(serviceName);
  }

  return globalForLogger.logger;
};

export const logger = getLogger();
