import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { jobService } from '../services/jobService.js';
import { providerRegistry } from '../providers/ProviderRegistry.js';
import { voiceService } from '../services/voiceService.js';
import { audioService } from '../services/audioService.js';
import { CONFIG } from '../config.js';
import { VoiceProfile, TTSDiagnostics } from '../../src/types.js';

const router = Router();

const GEMINI_BUILTIN_VOICES = new Set(['kore', 'fenrir', 'charon', 'zephyr', 'puck', 'aoede', 'leda', 'orpheus']);

function isBuiltinGeminiVoice(voiceId: string, requestedProvider?: string): boolean {
  if (requestedProvider === 'gemini') return true;
  return GEMINI_BUILTIN_VOICES.has(voiceId.toLowerCase().trim());
}

function createBuiltinGeminiProfile(voiceId: string, language?: string): VoiceProfile {
  const vName = voiceId.charAt(0).toUpperCase() + voiceId.slice(1);
  return {
    id: voiceId,
    name: `${vName} (Gemini Cloud Voice)`,
    engine: 'gemini',
    description: `Built-in Gemini Cloud TTS character voice (${vName})`,
    reference_audio_path: '',
    reference_audio_url: '',
    created_at: new Date().toISOString(),
    language: language || 'en',
    metadata: { isGeminiVoice: true, isBuiltin: true }
  };
}

/**
 * POST /api/tts/generate
 * Submits a speech generation job. Returns immediately with job_id.
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      voice_id,
      text,
      title,
      language,
      provider: requestedProvider,
      preset,
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

    let voice: VoiceProfile | undefined;
    let provider = requestedProvider;

    // Built-in Gemini voices bypass voiceService lookup and are handled directly by GeminiProvider
    if (isBuiltinGeminiVoice(voice_id, requestedProvider)) {
      provider = 'gemini';
      voice = createBuiltinGeminiProfile(voice_id, language);
    } else {
      // Only custom uploaded voices require stored voice profile lookup
      voice = voiceService.getVoiceById(voice_id);
      if (!voice) {
        return res.status(404).json({ error: `Voice profile '${voice_id}' not found` });
      }
      if (!provider) {
        provider = voice.engine || (voice.metadata?.isCloned ? 'f5-tts' : 'xtts');
      }
    }

    // Create job entry
    const job = await jobService.createJob({
      voice_id,
      text: text.trim(),
      title,
      language: language || voice.language || 'en',
      provider,
      preset,
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
      provider: job.provider,
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
    const {
      voice_id,
      script,
      language,
      provider = process.env.DEFAULT_VOICE_PROVIDER || 'gemini',
      pause_duration_ms = 850,
      speed = 1.0,
      speaking_style = 'Neutral',
      temperature = 0.75,
      repetition_penalty = 2.0
    } = req.body;

    if (!voice_id || !script) {
      return res.status(400).json({ error: 'voice_id and script are required' });
    }

    let voice: VoiceProfile | undefined;
    let resolvedProvider = provider;

    if (isBuiltinGeminiVoice(voice_id, provider)) {
      resolvedProvider = 'gemini';
      voice = createBuiltinGeminiProfile(voice_id, language);
    } else {
      voice = voiceService.getVoiceById(voice_id);
      if (!voice) {
        return res.status(404).json({ error: `Voice profile '${voice_id}' not found` });
      }
      if (!resolvedProvider) {
        resolvedProvider = voice.engine || (voice.metadata?.isCloned ? 'f5-tts' : 'xtts');
      }
    }

    if (resolvedProvider === 'xtts') {
      const worker = jobService.getOnlineWorker();
      if (!worker) {
        return res.status(503).json({
          error: 'XTTS voice cloning requires the Google Colab GPU worker. Switch provider to Gemini for instant cloud generation, or connect your Colab notebook.'
        });
      }
    }

    const chunks = audioService.splitDocumentaryScript(script);
    
    // Create master documentary job
    const masterJob = await jobService.createJob({
      voice_id,
      text: script,
      language: language || voice.language || 'en',
      provider: resolvedProvider,
      speed: Number(speed) || 1.0,
      speaking_style,
      temperature: Number(temperature) || 0.75,
      repetition_penalty: Number(repetition_penalty) || 2.0,
      is_documentary: true
    });
    masterJob.chunks_total = chunks.length;
    masterJob.chunks_completed = 0;

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
        const selectedProvider = providerRegistry.getProvider(resolvedProvider);

        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          const chunkJob = await jobService.createJob({
            voice_id,
            text: chunkText,
            language: language || voice.language || 'en',
            provider: resolvedProvider,
            speed: Number(speed) || 1.0,
            speaking_style,
            temperature: Number(temperature) || 0.75,
            repetition_penalty: Number(repetition_penalty) || 2.0
          });

          const result = await selectedProvider.processJob(chunkJob, voice);
          const wavPath = `${result.job_id}.wav`;
          chunkResults.push(wavPath);

          masterJob.chunks_completed = i + 1;
          masterJob.progress = Math.round(((i + 1) / chunks.length) * 90);
        }

        masterJob.progress = 95;

        // Concatenate all chunks
        const finalWavFileName = `${masterJob.job_id}.wav`;
        const finalWavPath = path.join(CONFIG.AUDIO_DIR, finalWavFileName);
        
        await audioService.concatenateWavFiles(
          chunkResults.map(f => path.join(CONFIG.AUDIO_DIR, f)),
          finalWavPath,
          Number(pause_duration_ms) || 850
        );

        const audioBuf = fs.readFileSync(finalWavPath);
        const exactDur = audioService.getWavDuration(audioBuf);
        const durationSec = Math.max(1, Math.round(exactDur));
        const isGeminiMode = resolvedProvider === 'gemini';
        const masterDiag: TTSDiagnostics = {
          provider_requested: resolvedProvider,
          provider_executed: resolvedProvider,
          voice_id: masterJob.voice_id,
          voice_name: isGeminiMode ? `${masterJob.voice_id} (Gemini Cloud Voice)` : voice.name,
          is_custom_voice: !isGeminiMode,
          fallback_used: false,
          final_synthesis_engine: isGeminiMode ? 'Google Gemini Flash TTS (Documentary Multi-Chunk Concatenator)' : `${resolvedProvider.toUpperCase()} Documentary Concatenator`,
          speed: Number(speed) || 1.0,
          speaking_style: speaking_style || 'Authoritative',
          temperature: Number(temperature) || 0.75,
          repetition_penalty: Number(repetition_penalty) || 2.0,
          language: language || voice.language || 'en',
          native_speed_applied: false,
          native_temperature_applied: isGeminiMode,
          native_repetition_penalty_applied: false,
          post_processing_applied: [`concat_${chunks.length}_chunks_pause_${pause_duration_ms || 850}ms`, 'pcm_to_wav_24000hz'],
          exact_duration_seconds: exactDur
        };

        await jobService.completeJobFromWorker(masterJob.job_id, audioBuf, 'wav', durationSec, 24000, masterDiag);
      } catch (err: any) {
        console.error('Documentary narration job failed:', err);
        jobService.failJob(masterJob.job_id, err.message || 'Documentary script generation failed');
      }
    })();

  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed processing documentary job' });
  }
});

/**
 * POST /api/tts/script-writer
 * AI Script Generator using Gemini 2.5 Flash for cinematic scripts with hook, body, and CTA.
 */
router.post('/script-writer', async (req: Request, res: Response) => {
  try {
    const { topic, style = 'Documentary', duration = '1m', audience = '', notes = '' } = req.body;
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Topic is required for AI script generation' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const wordsMap: Record<string, number> = {
      '30s': 75,
      '1m': 150,
      '3m': 450,
      '5m': 750,
      '10m': 1500
    };
    const targetWordCount = wordsMap[duration] || 150;

    const prompt = `You are a master cinematic screenwriter, documentary director, and voiceover copywriter.
Generate an immersive, highly engaging voiceover narration script.

Topic: ${topic}
Style: ${style}
Target Duration: ${duration} (approx ${targetWordCount} words)
${audience ? `Target Audience: ${audience}` : ''}
${notes ? `Special Creative Notes: ${notes}` : ''}

Strict Structure:
1. Hook: A jaw-dropping opening line or paragraph (0-5s) that immediately hooks listeners.
2. Main Body: Rich narrative paragraphs filled with vivid sensory details, rhythmic storytelling, and dramatic tension.
3. Cliffhanger/CTA: A memorable punchy climax, thought-provoking final question, or closing call to action.

Return your response strictly as JSON with this exact schema:
{
  "title": "Short compelling title",
  "hook": "Opening hook text",
  "body": "Main narration body paragraphs separated by double newlines",
  "cta": "Closing punchline or CTA",
  "full_script": "The complete merged script ready for audio synthesis",
  "suggested_gemini_voice": "kore",
  "suggested_preset": "Dark History",
  "word_count": 145,
  "estimated_duration_sec": 60
}

Note for suggested_gemini_voice:
- "kore" for Dark History, Deep documentary, Mystical
- "fenrir" for Powerful, Deep male, Epic Motivational
- "charon" for Movie trailer, Intense drama, Breaking investigative
- "zephyr" for Calm storytelling, Meditative, Podcast
- "puck" for Energetic YouTube, Fast-paced tech, Cheerful`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const raw = response.text || '{}';
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(clean);
    }

    return res.json(data);
  } catch (err: any) {
    console.error('AI Script Generator failed:', err);
    return res.status(500).json({ error: err.message || 'Failed generating AI script' });
  }
});

export default router;
