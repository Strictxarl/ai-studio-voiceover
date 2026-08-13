import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { CONFIG } from './server/config.js';
import ttsRoutes from './server/routes/ttsRoutes.js';
import voiceRoutes from './server/routes/voiceRoutes.js';
import workerRoutes from './server/routes/workerRoutes.js';
import providerRoutes from './server/routes/providerRoutes.js';

async function startServer() {
  const app = express();

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static audio serving routes
  app.use('/api/audio', express.static(CONFIG.AUDIO_DIR));
  app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

  // Mount API routes
  app.use('/api/tts', ttsRoutes);
  app.use('/api/voices', voiceRoutes);
  app.use('/api/worker', workerRoutes);
  app.use('/api/voice/providers', providerRoutes);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Personal AI Voice Studio',
      timestamp: new Date().toISOString()
    });
  });

  // Vite development middleware or Production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`[Voice Studio] Server listening on http://${CONFIG.HOST}:${CONFIG.PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Voice Studio] Failed to start server:', err);
  process.exit(1);
});
