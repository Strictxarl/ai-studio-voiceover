import { Router, Request, Response } from 'express';
import { jobService } from '../services/jobService.js';
import { providerRegistry } from '../providers/ProviderRegistry.js';
import { voiceService } from '../services/voiceService.js';
import { audioService } from '../services/audioService.js';

const router = Router();

/**
 * POST /api/tts/generate
 * Submits a speech generation job. Returns immediately with job_id.
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      voice_id,
      text,
      language,
     provider = process.env.DEFAULT_VOICE_PROVIDER || 'gemini',
      speed = 1.0,
      speaking_style = 'Neutral',
      temperature = 0.75,
      repetition_penalty = 2.0,
      output_format = 'wav',
      is_documentary = false
    } = req.body;

    if (!voice_id) {
      return res.status(400).json({ error: 'voice_id is required' });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Valid script text is required' });
    }

    const voice = voiceService.getVoiceById(voice_id);
    if (!voice) {
      return res.status(404).json({ error: `Voice profile '${voice_id}' not found` });
    }

    // Create job entry
    const job = await jobService.createJob({
      voice_id,
      text: text.trim(),
      language: language || voice.language || 'en',
      provider,
      speed: Number(speed) || 1.0,
      speaking_style,
      temperature: Number(temperature) || 0.75,
      repetition_penalty: Number(repetition_penalty) || 2.0,
      output_format,
      is_documentary: Boolean(is_documentary)
    });

    // Check provider availability
    const selectedProvider = providerRegistry.getProvider(job.provider);
    
    // Dispatch job (async)
    selectedProvider.processJob(job, voice).catch(err => {
      console.error(`[Job Error] Job ${job.job_id} failed:`, err.message);
      jobService.failJob(job.job_id, err.message);
    });

    return res.status(202).json({
      message: 'TTS Generation job enqueued successfully',
      job_id: job.job_id,
      status: job.status,
      estimated_duration_sec: audioService.estimateTextDuration(job.text),
      created_at: job.created_at
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to initialize TTS generation job' });
  }
});

/**
 * GET /api/tts/status/:job_id
 */
router.get('/status/:job_id', (req: Request, res: Response) => {
  const { job_id } = req.params;
  const job = jobService.getJob(job_id);

  if (!job) {
    return res.status(404).json({ error: `Job '${job_id}' not found` });
  }

  return res.json({
    job_id: job.job_id,
    status: job.status,
    progress: job.progress,
    created_at: job.created_at,
    updated_at: job.updated_at,
    error_message: job.error_message,
    result: job.result || null
  });
});

/**
 * GET /api/tts/result/:job_id
 */
router.get('/result/:job_id', (req: Request, res: Response) => {
  const { job_id } = req.params;
  const job = jobService.getJob(job_id);

  if (!job) {
    return res.status(404).json({ error: `Job '${job_id}' not found` });
  }

  if (job.status === 'failed') {
    return res.status(400).json({ status: 'failed', error: job.error_message });
  }

  if (job.status !== 'completed' || !job.result) {
    return res.status(202).json({ status: job.status, progress: job.progress, message: 'Job is still in progress' });
  }

  return res.json({
    status: 'completed',
    result: job.result
  });
});

/**
 * GET /api/tts/history
 */
router.get('/history', (_req: Request, res: Response) => {
  const jobs = jobService.getAllJobs();
  return res.json(jobs);
});

/**
 * DELETE /api/tts/history/:job_id
 */
router.delete('/history/:job_id', (req: Request, res: Response) => {
  const { job_id } = req.params;
  const success = jobService.deleteJob(job_id);

  if (!success) {
    return res.status(404).json({ error: `Job '${job_id}' not found` });
  }

  return res.json({ message: `Job '${job_id}' deleted successfully` });
});

/**
 * POST /api/tts/documentary
 * Long-script documentary mode: splits text into chunks, generates each chunk, concatenates audio files.
 */
router.post('/documentary', async (req: Request, res: Response) => {
  try {
    const { voice_id, script, language, provider = 'xtts', pause_duration_ms = 500 } = req.body;

    if (!voice_id || !script) {
      return res.status(400).json({ error: 'voice_id and script are required' });
    }

    const voice = voiceService.getVoiceById(voice_id);
    if (!voice) {
      return res.status(404).json({ error: `Voice profile '${voice_id}' not found` });
    }

    const worker = jobService.getOnlineWorker();
    if (!worker) {
      return res.status(503).json({
        error: 'Free GPU worker offline. Please connect your Google Colab GPU notebook worker.'
      });
    }

    const chunks = audioService.splitDocumentaryScript(script);
    
    // Create master documentary job
    const masterJob = await jobService.createJob({
      voice_id,
      text: script,
      language: language || voice.language || 'en',
      provider,
      is_documentary: true
    });

    res.status(202).json({
      message: 'Documentary mode job started',
      job_id: masterJob.job_id,
      total_chunks: chunks.length,
      chunks_preview: chunks.slice(0, 3)
    });

    // Asynchronously process chunks and concatenate
    (async () => {
      try {
        const chunkResults: string[] = [];
        const selectedProvider = providerRegistry.getProvider(provider);

        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          const chunkJob = await jobService.createJob({
            voice_id,
            text: chunkText,
            language: language || voice.language || 'en',
            provider
          });

          const result = await selectedProvider.processJob(chunkJob, voice);
          const wavPath = `${result.job_id}.wav`;
          chunkResults.push(wavPath);
        }

        // Concatenate all chunks
        const finalWavFileName = `${masterJob.job_id}.wav`;
        const finalWavPath = require('path').join(require('../config.js').CONFIG.AUDIO_DIR, finalWavFileName);
        
        await audioService.concatenateWavFiles(
          chunkResults.map(f => require('path').join(require('../config.js').CONFIG.AUDIO_DIR, f)),
          finalWavPath,
          Number(pause_duration_ms) || 500
        );

        const fs = require('fs');
        const audioBuf = fs.readFileSync(finalWavPath);
        await jobService.completeJobFromWorker(masterJob.job_id, audioBuf, 'wav');
      } catch (err: any) {
        console.error('Documentary narration job failed:', err);
        jobService.failJob(masterJob.job_id, err.message || 'Documentary script generation failed');
      }
    })();

  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed processing documentary job' });
  }
});

export default router;
