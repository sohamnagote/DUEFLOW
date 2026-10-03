import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config';

// Import route handlers
import authRoutes from './server/routes/auth';
import invoiceRoutes from './server/routes/invoices';
import clientRoutes from './server/routes/clients';
import dashboardRoutes from './server/routes/dashboard';
import reminderRoutes from './server/routes/reminders';
import aiRoutes from './server/routes/ai';
import cronRoutes from './server/routes/cron';
import webhookRoutes from './server/routes/webhooks';
import profileRoutes from './server/routes/profile';
import integrationRoutes from './server/routes/integrations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Parse JSON payloads
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
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

  // Vite development integration or static production assets
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = config.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[DueFlow Server] Running on http://0.0.0.0:${port} [${config.NODE_ENV}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
