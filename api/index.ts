import express from 'express';
import { config } from '../backend-ts/config';

// Import route handlers from existing backend-ts
import authRoutes from '../backend-ts/routes/auth';
import invoiceRoutes from '../backend-ts/routes/invoices';
import clientRoutes from '../backend-ts/routes/clients';
import dashboardRoutes from '../backend-ts/routes/dashboard';
import reminderRoutes from '../backend-ts/routes/reminders';
import aiRoutes from '../backend-ts/routes/ai';
import cronRoutes from '../backend-ts/routes/cron';
import webhookRoutes from '../backend-ts/routes/webhooks';
import profileRoutes from '../backend-ts/routes/profile';
import integrationRoutes from '../backend-ts/routes/integrations';

const app = express();

// Parse JSON payloads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes — exact same mounts as backend-ts/server.ts
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DueFlow API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Global API error handler
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Exception]', err);
  res.status(err.status || 500).json({
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Server error',
  });
});

export default app;
