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

// TRUST PROXY — sin esto req.ip es la IP del proxy y los limiters por IP (auth) meten a todos
// los usuarios en un solo bucket. El numero es cuantos saltos hay entre el cliente y este
// proceso, contados desde la DERECHA. MEDIDO en produccion el 2026-10-15, no estimado:
//
//   X-Forwarded-For: 190.18.147.247, 172.64.217.175, 10.28.178.210
//                    ^ cliente       ^ Cloudflare     ^ LB interno de Render
//
// Son 3: el socket peer (interno), el LB y Cloudflare. Con 1, req.ip daba 10.28.178.210 — una
// IP interna identica para todo el mundo, y dos personas en IPs reales distintas compartian el
// contador del rate limit (verificado con laptop por WiFi y celular por datos moviles).
//
// `true` NO es alternativa: toma el primer valor del header, que el cliente puede falsificar
// mandando su propio X-Forwarded-For. Un numero fijo cuenta desde la derecha, asi que lo que
// agregue un cliente por la izquierda queda afuera.
// `'uniquelocal'` tampoco: pararia en 172.64.x.x, que es publica (Cloudflare), no privada.
//
// Para re-medir si Render cambia su topologia, ver docs/entrega/deployment.md.
app.set('trust proxy', 3);

// Security headers
app.use(helmet());

// CORS — only allow requests from the frontend
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Parse JSON bodies
// 3mb, no el default de 100kb: POST /auth/me/avatar manda la imagen como data URL base64 (sin
// multer — ver auth.schema.ts), y base64 infla el tamaño original ~33%. El bucket de Supabase
// ya tope-a el archivo real en 2MB; 3mb deja margen para ese overhead más el resto del JSON.
app.use(express.json({ limit: '3mb' }));

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
