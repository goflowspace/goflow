import winston from "winston";
import path from "path";

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

export const logger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: logFormat,
            level: "error"
        }),
        new winston.transports.File({ filename: path.join(process.cwd(), "logs/error.log"), level: "error" }),
        new winston.transports.File({ filename: path.join(process.cwd(), "logs/combined.log") })
    ]
});
