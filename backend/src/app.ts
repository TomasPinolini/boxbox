import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { NotFoundError } from './shared/errors';
import authRoutes from './modules/auth/auth.routes';
import driversRoutes from './modules/drivers/drivers.routes';
import constructorsRoutes from './modules/constructors/constructors.routes';
import circuitsRoutes from './modules/circuits/circuits.routes';
import seasonsRoutes from './modules/seasons/seasons.routes';
import racesRoutes from './modules/races/races.routes';
import leaguesRoutes from './modules/leagues/leagues.routes';
import syncRoutes from './modules/sync/sync.routes';

const app = express();

// 3 saltos medidos en produccion (Render + su LB + Cloudflare), contados desde la derecha de
// X-Forwarded-For. Con menos, req.ip es una IP interna comun a todos y los limiters por IP
// comparten contador; `true` no sirve porque toma el valor que el cliente puede falsificar.
// Como re-medirlo: docs/entrega/deployment.md.
app.set('trust proxy', 3);

app.use(helmet());

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// 3mb y no 100kb: el avatar llega como data URL base64, que infla ~33% el archivo de hasta 2MB.
app.use(express.json({ limit: '3mb' }));

app.use(cookieParser());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/drivers', driversRoutes);
app.use('/api/v1/constructors', constructorsRoutes);
app.use('/api/v1/circuits', circuitsRoutes);
app.use('/api/v1/seasons', seasonsRoutes);
app.use('/api/v1/races', racesRoutes);
app.use('/api/v1/leagues', leaguesRoutes);
app.use('/api/v1/admin/sync', syncRoutes);

// Sin esto Express responde su pagina HTML "Cannot GET", y el frontend espera el envelope { error }.
app.use((_req, _res, next) => {
  next(new NotFoundError('Route'));
});

app.use(errorHandler);

export default app;
