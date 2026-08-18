import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { registerDraftGateway } from './modules/draft/draft.gateway';
import { setIo } from './shared/socket';

// Slice 6: Socket.io necesita un http.Server crudo para engancharse (no puede colgar
// directo de la app de Express). httpServer envuelve la misma app — las rutas REST siguen
// funcionando identico, esto solo agrega el namespace /draft por arriba.
const httpServer = createServer(app);
const io = registerDraftGateway(httpServer);
setIo(io);

httpServer.listen(env.PORT, () => {
  console.log(`🏎️ BoxBox API running on http://localhost:${env.PORT}`);
  console.log(`📋 Health check: http://localhost:${env.PORT}/api/v1/health`);
  console.log(`🔌 Draft socket namespace: ws://localhost:${env.PORT}/draft`);
});
