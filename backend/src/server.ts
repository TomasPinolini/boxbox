import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`🏎️ BoxBox API running on http://localhost:${env.PORT}`);
  console.log(`📋 Health check: http://localhost:${env.PORT}/api/v1/health`);
});
