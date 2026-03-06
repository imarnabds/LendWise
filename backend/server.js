const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');
const swaggerSpec = require('./docs/swagger');

dotenv.config();

const app = express();

// ── Security Middleware ──────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(rateLimiter);                 // 100 req / 15 min per IP

// ── Core Middleware ──────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// NoSQL injection prevention (Express 5 compatible — only sanitize body/query)
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
<title>MicroLend API Docs</title>
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
const verifyRoutes = require('./routes/dial2verify');

app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/verify', verifyRoutes);

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Centralized Error Handler (must be AFTER all routes) ─
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        logger.info('✅ MongoDB connected successfully');
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📄 Swagger docs at http://localhost:${PORT}/api-docs`);
        });
    })
    .catch((err) => {
        logger.error(`❌ MongoDB connection error: ${err.message}`);
        process.exit(1);
    });

// Export app for testing (Supertest)
module.exports = app;
