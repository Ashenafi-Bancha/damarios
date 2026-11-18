import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import { LOCAL_UPLOAD_DIR } from './lib/storage';
import { errorHandler } from './lib/http';
import { clientIp } from './lib/limits';
import { prisma } from './lib/prisma';
import { config } from './config';

morgan.token('client-ip', (req) => clientIp(req as express.Request));

export function createApp() {
  const app = express();
  // The API runs behind one proxy: DigitalOcean's load balancer in production, Next's /api proxy locally.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.frontendOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (config.isProd) {
    // One line per request, without the health checks the platform sends every few seconds.
    app.use(morgan(':client-ip :method :url :status :res[content-length] - :response-time ms', { skip: (req) => req.url === '/api/health' }));
  } else if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check for the hosting platform: the API is up and can reach the database.
  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false, error: 'Database not reachable' });
    }
  });

  // Photos saved on this server's disk (local development). In production they are on DigitalOcean Spaces.
  if (!config.spaces) app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '30d', index: false }));
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use(errorHandler);
  return app;
}
