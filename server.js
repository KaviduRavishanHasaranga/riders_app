const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load .env.production in production, .env otherwise
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.join(__dirname, envFile) });

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required behind Nginx)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Auth routes (no middleware needed — public)
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// Protected routes (require JWT)
const { authMiddleware } = require('./middleware/authMiddleware');
const tripsRouter = require('./routes/trips');
const reportsRouter = require('./routes/reports');
const settingsRouter = require('./routes/settings');

app.use('/api/trips', authMiddleware, tripsRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Riders Net Profit Watch API running on http://localhost:${PORT}`);
  console.log(`   Auth Endpoints:`);
  console.log(`   - POST   /api/auth/register`);
  console.log(`   - POST   /api/auth/login`);
  console.log(`   - GET    /api/auth/me`);
  console.log(`   Protected Endpoints (require JWT):`);
  console.log(`   - POST   /api/trips`);
  console.log(`   - GET    /api/trips`);
  console.log(`   - GET    /api/trips/:id`);
  console.log(`   - PUT    /api/trips/:id`);
  console.log(`   - DELETE /api/trips/:id`);
  console.log(`   - GET    /api/reports/dashboard`);
  console.log(`   - GET    /api/reports/daily?date=YYYY-MM-DD`);
  console.log(`   - GET    /api/reports/monthly?year=YYYY&month=MM`);
  console.log(`   - GET    /api/reports/annual?year=YYYY`);
});
