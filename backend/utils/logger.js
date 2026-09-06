/**
 * Winston Logger — centralized structured logging.
 *
 * Transports:
 *   - Console (colorized, all levels)
 *   - logs/error.log  (error level only)
 *   - logs/combined.log (all levels)
 */

const winston = require('winston');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'microlend-api' },
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5
        })
    ]
});

// Console transport for stdout/stderr (active in dev and production for Render log capture)
const consoleFormat = process.env.NODE_ENV === 'production'
    ? winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
            return stack
                ? `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`
                : `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
            return stack
                ? `${timestamp} ${level}: ${message}\n${stack}`
                : `${timestamp} ${level}: ${message}`;
        })
    );

logger.add(new winston.transports.Console({
    format: consoleFormat
}));


module.exports = logger;
