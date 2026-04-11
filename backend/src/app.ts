import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import driversRoutes from './modules/drivers/drivers.routes';
import constructorsRoutes from './modules/constructors/constructors.routes';
import circuitsRoutes from './modules/circuits/circuits.routes';
import seasonsRoutes from './modules/seasons/seasons.routes';
import racesRoutes from './modules/races/races.routes';

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow requests from the frontend
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Parse JSON bodies
app.use(express.json());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/drivers', driversRoutes);
app.use('/api/v1/constructors', constructorsRoutes);
app.use('/api/v1/circuits', circuitsRoutes);
app.use('/api/v1/seasons', seasonsRoutes);
app.use('/api/v1/races', racesRoutes);

// Error handler — must be registered AFTER all routes
app.use(errorHandler);

export default app;
