import express from 'express';
import { config } from './config';

// Import route handlers from backend-ts
import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import clientRoutes from './routes/clients';
import dashboardRoutes from './routes/dashboard';
import reminderRoutes from './routes/reminders';
import aiRoutes from './routes/ai';
import cronRoutes from './routes/cron';
import webhookRoutes from './routes/webhooks';
import profileRoutes from './routes/profile';
import integrationRoutes from './routes/integrations';

const app = express();

// Parse JSON payloads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Create common API Router
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/integrations', integrationRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/clients', clientRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/reminders', reminderRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/cron', cronRoutes);
apiRouter.use('/webhooks', webhookRoutes);

const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    service: 'DueFlow API',
    version: '1.0.0',
    environment: config.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
};

apiRouter.get('/health', healthHandler);

// Mount router on both '/api' and '/' to handle either URL style in Vercel serverless
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global API error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Exception]', err);
  res.status(err.status || 500).json({
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Server error',
  });
});

export default app;
