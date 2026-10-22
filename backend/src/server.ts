// Primera linea a proposito: si se mueve abajo, Sentry deja de instrumentar.
import './instrument';
import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { registerDraftGateway } from './modules/draft/draft.gateway';
import { setIo } from './shared/socket';

// Socket.io se engancha a un http.Server, no a la app de Express.
const httpServer = createServer(app);
const io = registerDraftGateway(httpServer);
setIo(io);

httpServer.listen(env.PORT, () => {
  console.log(`🏎️ BoxBox API running on http://localhost:${env.PORT}`);
  console.log(`📋 Health check: http://localhost:${env.PORT}/api/v1/health`);
  console.log(`🔌 Draft socket namespace: ws://localhost:${env.PORT}/draft`);
});
