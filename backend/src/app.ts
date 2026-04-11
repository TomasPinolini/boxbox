import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';

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

export default app;
