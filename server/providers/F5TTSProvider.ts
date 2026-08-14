import fs from 'fs';
import path from 'path';
import { VoiceProvider } from './VoiceProvider.js';
import { TTSJob, VoiceProfile, TTSResult, ProviderStatusInfo, TTSDiagnostics } from '../../src/types.js';
import { jobService } from '../services/jobService.js';
import { audioService } from '../services/audioService.js';

export class F5TTSProvider implements VoiceProvider {
  id = 'f5-tts';
  name = 'F5-TTS Neural Voice Cloner';
  model = 'SWivid/F5-TTS';
  supportsCloning = true;

  async processJob(job: TTSJob, voiceProfile?: VoiceProfile): Promise<TTSResult> {
    const refAudioPath = voiceProfile?.reference_audio_path;
    const voiceId = voiceProfile?.id || job.voice_id;
    const speed = Number(job.speed) || 1.0;
    const style = job.speaking_style || 'Neutral';
    const temp = job.temperature !== undefined ? Number(job.temperature) : 0.75;
    const repPenalty = job.repetition_penalty !== undefined ? Number(job.repetition_penalty) : 2.0;

    // Server-side audit logging
    console.log(`[F5-TTS Synthesis] Provider: ${this.id} | Voice ID: ${voiceId} (${voiceProfile?.name || 'Custom'}) | Ref Audio Path: ${refAudioPath || 'None'} | Speed: ${speed}x | Temp: ${temp} | Repetition Penalty (ignored by F5): ${repPenalty} | Style: ${style} | Text Length: ${job.text.length}`);

    // Verify reference audio
    if (!refAudioPath || !fs.existsSync(refAudioPath)) {
      throw new Error(`[F5-TTS] Missing or invalid reference audio file at: '${refAudioPath}'. Please upload or select a valid reference voice sample.`);
    }

    const refStats = fs.statSync(refAudioPath);
    if (refStats.size < 1000) {
      throw new Error(`[F5-TTS] Reference audio file '${refAudioPath}' is too small (${refStats.size} bytes). Provide a clean 5-30s voice recording.`);
    }

    const rawRefBuffer = fs.readFileSync(refAudioPath);
    const refDuration = Math.round(audioService.getWavDuration(rawRefBuffer));
    const refBase64 = rawRefBuffer.toString('base64');
    const f5ApiUrl = process.env.F5_TTS_API_URL;

    // 1. If external F5-TTS endpoint is configured (e.g. self-hosted server or Colab tunnel)
    if (f5ApiUrl) {
      try {
        console.log(`[F5-TTS] Dispatching synthesis request to external endpoint: ${f5ApiUrl}`);
        const payload = {
          text: job.processed_text || job.text,
          speed,
          language: job.language || 'en',
          speaking_style: style,
          reference_audio_base64: refBase64,
          reference_audio_filename: path.basename(refAudioPath),
          reference_audio_format: path.extname(refAudioPath).replace('.', '') || 'wav'
        };

        const res = await fetch(`${f5ApiUrl.replace(/\/$/, '')}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`External F5-TTS server returned status ${res.status}: ${errText}`);
        }

        const audioBuffer = Buffer.from(await res.arrayBuffer());
        
        // Ensure speed timing is applied
        const { buffer: finalWavBuffer, duration: exactDuration } = await audioService.adjustAudioSpeed(
          audioBuffer,
          speed,
          24000
        );

        const durationSec = Math.max(1, Math.round(exactDuration));
        const postProcessing: string[] = [];
        if (Math.abs(speed - 1.0) >= 0.01) {
          postProcessing.push(`ffmpeg_atempo_${speed.toFixed(2)}x`);
        }

        const diagnostics: TTSDiagnostics = {
          provider_requested: job.provider,
          provider_executed: 'f5-tts',
          voice_id: voiceId,
          voice_name: voiceProfile?.name || 'Custom Cloned Voice',
          is_custom_voice: true,
          reference_audio_path: refAudioPath,
          reference_audio_url: voiceProfile?.reference_audio_url,
          reference_audio_exists: true,
          reference_audio_duration_sec: refDuration,
          reference_audio_size_bytes: refStats.size,
          fallback_used: false,
          final_synthesis_engine: 'SWivid/F5-TTS Flow Matching',
          speed,
          speaking_style: style,
          temperature: temp,
          repetition_penalty: repPenalty,
          language: job.language || 'en',
          native_speed_applied: true,
          native_temperature_applied: false,
          native_repetition_penalty_applied: false,
          post_processing_applied: postProcessing,
          exact_duration_seconds: exactDuration
        };

        return await jobService.completeJobFromWorker(
          job.job_id,
          finalWavBuffer,
          'wav',
          durationSec,
          24000,
          diagnostics
        );
      } catch (err: any) {
        console.error('[F5-TTS] External endpoint failed:', err.message);
        throw new Error(`F5-TTS synthesis failed via configured endpoint (${f5ApiUrl}): ${err.message}`);
      }
    }

    // 2. Check for GPU Worker supporting F5-TTS queue
    const worker = jobService.getOnlineWorker();
    if (worker && (worker.gpu_name.toLowerCase().includes('f5') || worker.status === 'online')) {
      console.log(`[F5-TTS] Enqueuing job ${job.job_id} to GPU worker (${worker.gpu_name})...`);
      await jobService.enqueueJob(job);
      return await jobService.waitForJobCompletion(job.job_id);
    }

    // 3. Strict error if F5-TTS runner/worker is offline (DO NOT silently generate with Gemini)
    throw new Error(
      "F5-TTS is unavailable. Your custom cloned voice cannot currently be generated. Please connect your GPU worker or configure the F5_TTS_API_URL environment variable."
    );
  }

  async getStatus(): Promise<ProviderStatusInfo> {
    const f5ApiUrl = process.env.F5_TTS_API_URL;
    const worker = jobService.getOnlineWorker();
    const isOnline = !!f5ApiUrl || !!worker;

    return {
      id: this.id,
      name: this.name,
      provider: 'F5-TTS / Non-Autoregressive Flow Matching',
      model: this.model,
      status: isOnline ? 'active' : 'standby',
      gpu_available: isOnline,
      inference_type: 'OPEN SOURCE MODEL',
      pricing_status: isOnline ? 'Ready for Voice Flow Matching' : 'Worker / Endpoint Required',
      description: 'State-of-the-art zero-shot voice cloning engine reproducing voice identity directly from reference audio.',
      supports_cloning: true,
      supported_languages: [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-cn', 'hi', 'ru', 'ar', 'nl', 'tr'
      ]
    };
  }
}

