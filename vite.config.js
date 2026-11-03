import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/* Dev-only crash beacon. There is no browser in the build sandbox, so the preview
   itself reports the first runtime exception back to this process. Serve-only: it is
   not part of the production build and never runs for a built app. */
const crashBeacon = () => ({
  name: 'crash-beacon',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__client-error', (req, res, next) => {
      if (req.method !== 'POST') return next();
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const stamp = new Date().toISOString();
        fs.appendFileSync('/tmp/client-errors.log', `\n===== ${stamp} =====\n${body}\n`);
        server.config.logger.warn(`[client-error] ${body.slice(0, 4000)}`);
        res.statusCode = 204;
        res.end();
      });
    });
  },
});

export default defineConfig({
  plugins: [react(), crashBeacon()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
});
