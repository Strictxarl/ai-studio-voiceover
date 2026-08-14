import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  HOST: '0.0.0.0',
  WORKER_API_KEY: process.env.WORKER_API_KEY || 'voice_studio_secret_worker_key_2026',
  DEFAULT_VOICE_PROVIDER: process.env.DEFAULT_VOICE_PROVIDER || 'gemini',
  
  // Storage directories
  UPLOADS_DIR: path.join(process.cwd(), 'uploads'),
  VOICES_DIR: path.join(process.cwd(), 'uploads', 'voices'),
  AUDIO_DIR: path.join(process.cwd(), 'uploads', 'audio'),
  SUBTITLES_DIR: path.join(process.cwd(), 'uploads', 'subtitles'),
  DATA_DIR: path.join(process.cwd(), 'data'),
  
  // Heartbeat timeout (worker marked offline if no heartbeat for 45s)
  WORKER_TIMEOUT_MS: 45000,
  
  // Max upload sizes
  MAX_VOICE_FILE_SIZE: 50 * 1024 * 1024, // 50MB
};
