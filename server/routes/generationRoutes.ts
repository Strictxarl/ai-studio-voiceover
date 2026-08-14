import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import * as archiverModule from 'archiver';
const archiver: any = (archiverModule as any).default || archiverModule;
import { generationRepository } from '../services/generationRepository.js';
import { jobService } from '../services/jobService.js';
import { subtitleService } from '../services/subtitleService.js';
import { audioService } from '../services/audioService.js';
import { CONFIG } from '../config.js';

const router = Router();

/**
 * GET /api/generations
 * Returns recent generation records stored in SQLite
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const list = await generationRepository.listRecentGenerations(limit);
    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list generations' });
  }
});

/**
 * GET /api/generations/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const generation = await generationRepository.getGenerationById(id);
    if (!generation) {
      return res.status(404).json({ error: 'Generation record not found' });
    }
    return res.json(generation);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch generation' });
  }
});

/**
 * DELETE /api/generations/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await generationRepository.deleteGeneration(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Generation record not found' });
    }
    return res.json({ message: 'Generation deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete generation' });
  }
});

/**
 * GET /api/share/:id
 * Public metadata endpoint for shareable audio page
 */
router.get('/share/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const generation = await generationRepository.getGenerationById(id);
    
    if (!generation) {
      // Check in-memory / jobs.json if not yet in SQLite
      const job = jobService.getJob(id);
      if (job && job.result) {
        return res.json({
          id: job.job_id,
          jobId: job.job_id,
          title: job.title || (job.text.length > 50 ? `${job.text.substring(0, 47)}...` : job.text),
          script: job.text,
          provider: job.provider,
          voiceId: job.voice_id,
          preset: job.preset || 'Documentary',
          language: job.language || 'en',
          audioWavUrl: job.result.wav_url || `/api/audio/${job.job_id}.wav`,
          audioMp3Url: job.result.mp3_url || `/api/audio/${job.job_id}.mp3`,
          subtitleSrtUrl: job.result.subtitle_srt_url || `/uploads/subtitles/${job.job_id}.srt`,
          subtitleVttUrl: job.result.subtitle_vtt_url || `/uploads/subtitles/${job.job_id}.vtt`,
          durationSeconds: job.result.duration,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        });
      }
      return res.status(404).json({ error: 'Shared audio project not found' });
    }

    return res.json(generation);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed fetching shared generation' });
  }
});

/**
 * Helper to handle ZIP export stream
 */
async function handleExportZip(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const generation = await generationRepository.getGenerationById(id);
    const job = !generation ? jobService.getJob(id) : null;

    if (!generation && (!job || !job.result)) {
      return res.status(404).json({ error: 'Generation project not found for export' });
    }

    const jobId = generation ? generation.jobId : job!.job_id;
    const scriptText = generation ? generation.script : job!.text;
    const duration = generation ? (generation.durationSeconds || 0) : (job!.result?.duration || 0);

    const wavPath = path.join(CONFIG.AUDIO_DIR, `${jobId}.wav`);
    const mp3Path = path.join(CONFIG.AUDIO_DIR, `${jobId}.mp3`);
    let srtPath = path.join(CONFIG.SUBTITLES_DIR, `${jobId}.srt`);
    let vttPath = path.join(CONFIG.SUBTITLES_DIR, `${jobId}.vtt`);

    // Ensure MP3 exists if WAV is present
    if (fs.existsSync(wavPath) && !fs.existsSync(mp3Path)) {
      await audioService.convertWavToMp3(wavPath, mp3Path);
    }

    // Ensure Subtitles exist
    if (!fs.existsSync(srtPath) || !fs.existsSync(vttPath)) {
      if (fs.existsSync(wavPath)) {
        await subtitleService.generateSubtitles(wavPath, jobId, scriptText, duration);
      }
    }

    const zipFileName = `voice_studio_project_${jobId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    archive.on('error', (err) => {
      console.error('[Export Error] ZIP Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed creating project ZIP bundle' });
      }
    });

    archive.pipe(res);

    // 1. narration.wav
    if (fs.existsSync(wavPath)) {
      archive.file(wavPath, { name: 'narration.wav' });
    }

    // 2. narration.mp3
    if (fs.existsSync(mp3Path)) {
      archive.file(mp3Path, { name: 'narration.mp3' });
    }

    // 3. subtitles.srt
    if (fs.existsSync(srtPath)) {
      archive.file(srtPath, { name: 'subtitles.srt' });
    }

    // 4. subtitles.vtt
    if (fs.existsSync(vttPath)) {
      archive.file(vttPath, { name: 'subtitles.vtt' });
    }

    // 5. script.txt
    archive.append(scriptText, { name: 'script.txt' });

    await archive.finalize();
  } catch (error: any) {
    console.error('Export ZIP failed:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Failed generating export package' });
    }
  }
}

/**
 * POST /api/export/:id & GET /api/export/:id
 */
router.post('/export/:id', handleExportZip);
router.get('/export/:id', handleExportZip);

export default router;
