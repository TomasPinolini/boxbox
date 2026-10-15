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

// TRUST PROXY — en Render el browser habla con el proxy y el proxy con este proceso, asi que
// sin esto req.ip es SIEMPRE la IP del proxy y los limiters por IP (auth) meterian a todos los
// usuarios en un solo bucket. El 1 es "confia en un salto": Express descarta el ultimo valor de
// X-Forwarded-For (el proxy) y toma el anterior (el cliente). `true` confiaria en la cadena
// entera, que el cliente puede falsificar — un header por intento y el limiter no sirve.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — only allow requests from the frontend
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Parse JSON bodies
app.use(express.json());

// Parse cookies — necesario para leer req.cookies.refreshToken en POST /auth/refresh y /auth/logout (Slice 1c).
app.use(cookieParser());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/drivers', driversRoutes);
app.use('/api/v1/constructors', constructorsRoutes);
app.use('/api/v1/circuits', circuitsRoutes);
app.use('/api/v1/seasons', seasonsRoutes);
app.use('/api/v1/races', racesRoutes);
app.use('/api/v1/leagues', leaguesRoutes);
app.use('/api/v1/admin/sync', syncRoutes);

// 404 JSON para cualquier ruta que ningun router atendio. Sin esto Express responde su pagina
// HTML "Cannot GET /..." — el frontend espera siempre el envelope { error } (A3 / BOX-13).
// Va DESPUES de todos los routers y ANTES del errorHandler: es el ultimo middleware "normal".
app.use((_req, _res, next) => {
  next(new NotFoundError('Route'));
});

// Error handler — must be registered AFTER all routes
app.use(errorHandler);

export default app;
