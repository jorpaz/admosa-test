import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { fileStorage } from './services/fileStorage';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import filesRoutes from './modules/files/files.routes';
import auditRoutes from './modules/audit/audit.routes';
import adminRoutes from './modules/users/users.routes';

async function bootstrap(): Promise<void> {
  // Asegurar directorio de almacenamiento
  await fileStorage.ensureReady();

  const app = express();

  // Confianza en proxy (importante si va detrás de nginx/load balancer)
  app.set('trust proxy', 1);

  // --- Seguridad base ---
  app.use(helmet());

  // CORS estricto — solo el frontend declarado, con credenciales (cookies)
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    })
  );

  // --- Parsers ---
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // --- Healthcheck ---
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // --- Rutas ---
  app.use('/api/auth',  authRoutes);
  app.use('/api/files', filesRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/admin', adminRoutes);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
  });

  // Error handler (siempre al final)
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log(`║  ADMOSA Backend listening on :${env.PORT}                 ║`);
    console.log(`║  Env: ${env.NODE_ENV.padEnd(46)}║`);
    console.log(`║  CORS allowed: ${env.FRONTEND_URL.padEnd(36)}║`);
    console.log('╚════════════════════════════════════════════════════╝');
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
