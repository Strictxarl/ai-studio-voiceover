
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { jobService } from '../services/jobService.js';
import { voiceService } from '../services/voiceService.js';

const router = Router();

// ==========================================
// Upload storage for worker audio results
// ==========================================
const upload = multer({
  dest: path.join(CONFIG.UPLOADS_DIR, 'tmp'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// ==========================================
// Verify Worker API Key
// ==========================================
const verifyWorkerApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKeyHeader =
    req.headers['x-worker-api-key'] ||
    req.headers['authorization']?.replace('Bearer ', '');

  const apiKeyQuery = req.query.api_key;

  const key = (apiKeyHeader || apiKeyQuery || '').toString();

  if (CONFIG.WORKER_API_KEY && key !== CONFIG.WORKER_API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid Worker API Key',
    });
  }

  next();
};

// ==========================================
// POST /api/worker/register
// ==========================================
router.post(
  '/register',
  verifyWorkerApiKey,
  (req: Request, res: Response) => {
    try {
      const workerInfo = jobService.registerWorker(req.body);

      return res.json({
        success: true,
        online: true,
        message: 'Worker registered successfully',
        worker: workerInfo,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// ==========================================
// POST /api/worker/heartbeat
// ==========================================
router.post(
  '/heartbeat',
  verifyWorkerApiKey,
  (req: Request, res: Response) => {
    const { worker_id } = req.body;

    if (!worker_id) {
      return res.status(400).json({
        error: 'worker_id is required',
      });
    }

    const updated = jobService.updateWorkerHeartbeat(worker_id, req.body);

    if (!updated) {
      // Auto-register worker if missing
      const newWorker = jobService.registerWorker(req.body);

      return res.json({
        success: true,
        message: 'Worker auto-registered via heartbeat',
        worker: newWorker,
      });
    }

    return res.json({
      success: true,
      status: 'online',
      worker: updated,
    });
  }
);

// ==========================================
// GET /api/worker/status
// Frontend uses this to show ONLINE/OFFLINE
// ==========================================
router.get('/status', (_req: Request, res: Response) => {
  const workers = jobService.getAllWorkers
    ? jobService.getAllWorkers()
    : [];

  const activeWorkers = Array.isArray(workers)
    ? workers.filter(
        (w: any) => {
          const lastTime = w.last_heartbeat || w.last_seen;
          return lastTime && (Date.now() - new Date(lastTime).getTime() < 60000);
        }
      )
    : [];

  return res.json({
    online: activeWorkers.length > 0,
    workerCount: activeWorkers.length,
    workers: activeWorkers,
  });
});

// ==========================================
// GET /api/worker/jobs
// Worker polls for pending jobs
// ==========================================
router.get(
  '/jobs',
  verifyWorkerApiKey,
  (req: Request, res: Response) => {
    const job = jobService.getNextPendingJobForWorker();

    // IMPORTANT FIX:
    // Always return valid JSON instead of 204 No Content
    if (!job) {
      return res.json({});
    }

    const voice = voiceService.getVoiceById(job.voice_id);

    const host = req.headers.host || `localhost:${CONFIG.PORT}`;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;

    const voiceAudioUrl = voice?.reference_audio_url
      ? voice.reference_audio_url.startsWith('http')
        ? voice.reference_audio_url
        : `${baseUrl}${voice.reference_audio_url}`
      : null;

    return res.json({
      job_id: job.job_id,
      voice_id: job.voice_id,
      text: job.processed_text || job.text,
      raw_text: job.text,
      language: job.language,
      speed: job.speed,
      temperature: job.temperature,
      repetition_penalty: job.repetition_penalty,
      output_format: job.output_format,
      voice_profile: {
        name: voice?.name || 'Default Voice',
        reference_audio_url: voiceAudioUrl,
        reference_audio_path: voice?.reference_audio_path,
      },
    });
  }
);

// ==========================================
// POST /api/worker/jobs/:id/result
// Upload generated audio result
// ==========================================
router.post(
  '/jobs/:id/result',
  verifyWorkerApiKey,
  upload.single('audio_file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const {
        status,
        error,
        duration,
        sample_rate,
        format = 'wav',
      } = req.body;

      // Handle failed jobs
      if (status === 'failed' || error) {
        jobService.failJob(
          id,
          error || 'Generation failed on Colab GPU worker'
        );

        return res.json({
          success: true,
          message: 'Job failure recorded',
        });
      }

      // Require either uploaded file or base64 audio
      if (!req.file && !req.body.audio_base64) {
        return res.status(400).json({
          error:
            'Missing generated audio file or audio_base64 data',
        });
      }

      let audioBuffer: Buffer;

      if (req.file) {
        audioBuffer = fs.readFileSync(req.file.path);

        // Clean up temporary file
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      } else {
        audioBuffer = Buffer.from(
          req.body.audio_base64,
          'base64'
        );
      }

      const durationSec = Number(duration) || 0;
      const sampleRate = Number(sample_rate) || 24000;
      const ext = (format || 'wav').toLowerCase() as 'wav' | 'mp3';

      const result = await jobService.completeJobFromWorker(
        id,
        audioBuffer,
        ext,
        durationSec,
        sampleRate
      );

      return res.json({
        success: true,
        message: 'Result processed successfully',
        result,
      });
    } catch (error: any) {
      console.error(
        `Error completing job ${req.params.id}:`,
        error
      );

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

export default router;