const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const errorHandler = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');
const swaggerSpec = require('./docs/swagger');
const connectDB = require('./config/db');
const validateEnv = require('./config/validateEnv');
const redisConfig = require('./config/redis');

dotenv.config();

// Validate required environment variables on startup
validateEnv();

// Connect to MongoDB
connectDB();

const app = express();

// ── Security Middleware ──────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://www.gstatic.com", "https://www.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com"],
            frameSrc: ["'self'", "https://www.google.com", "https://*.firebaseapp.com"]
        }
    }
}));
app.use(rateLimiter);

// ── Core Middleware ──────────────────────────────────────
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: frontendUrl }));
app.use(express.json({ limit: '10kb' }));

// NoSQL injection prevention (Express 5 compatible — sanitize body/query)
app.use((req, res, next) => {
    if (req.body) req.body = mongoSanitize.sanitize(req.body);
    if (req.query) req.query = mongoSanitize.sanitize(req.query);
    next();
});

// ── HTTP Request Logging (Morgan → Winston) ──────────────
const morganStream = { write: (message) => logger.info(message.trim()) };
app.use(morgan('short', { stream: morganStream }));

// ── API Documentation (Express 5 compatible) ────────────
app.get('/api-docs/swagger.json', (req, res) => {
    res.json(swaggerSpec);
});
app.get('/api-docs', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head>
<title>LendWise API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:'/api-docs/swagger.json',dom_id:'#swagger-ui',presets:[SwaggerUIBundle.presets.apis],layout:'BaseLayout'});</script>
</body></html>`);
});

// ── Routes ───────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const paymentRoutes = require('./routes/payments');
const aiRoutes = require('./routes/ai');
const reportRoutes = require('./routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const redisState = redisConfig.isReady() ? 'connected' : 'disabled/disconnected';
    const mem = process.memoryUsage();
    const pkg = require('./package.json');
    res.json({
        status: dbState === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        version: pkg.version,
        nodeVersion: process.version,
        services: {
            database: dbState,
            redis: redisState
        },
        memory: {
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
            externalMB: Math.round(mem.external / 1024 / 1024)
        }
    });
});

// ── 404 Fallback Handler for Unhandled Routes (JSON Guarantee) ──
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
});


// ── Centralized Error Handler (must be AFTER all routes and 404 handler) ──
app.use(errorHandler);



const http = require('http');
const { initSocket, getIO } = require('./socket/socketServer');
const registerSocketEvents = require('./socket/socketEvents');

// Register domain event listeners for Socket.IO dispatch
registerSocketEvents();

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
    logger.info(`🚀 LendWise Server running on port ${PORT} (HTTP + Socket.IO)`);
    logger.info(`📄 Swagger docs at http://localhost:${PORT}/api-docs`);
});

// ── Graceful Shutdown Handler ─────────────────────────────
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        logger.info('HTTP server closed.');
        try {
            const io = getIO();
            if (io) io.close();
            logger.info('Socket.IO server closed.');
        } catch { /* silent */ }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed.');
        }
        if (redisConfig.client && redisConfig.isReady()) {
            await redisConfig.client.quit();
            logger.info('Redis connection closed.');
        }
        logger.info('Graceful shutdown completed.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

app.server = server;
module.exports = app;
