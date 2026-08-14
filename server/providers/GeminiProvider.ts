import { GoogleGenAI, Modality } from '@google/genai';
import { VoiceProvider } from './VoiceProvider.js';
import { TTSJob, VoiceProfile, TTSResult, ProviderStatusInfo, TTSDiagnostics } from '../../src/types.js';
import { jobService } from '../services/jobService.js';
import { audioService } from '../services/audioService.js';

export class GeminiProvider implements VoiceProvider {
  id = 'gemini';
  name = 'Google Gemini Flash TTS';
  model = 'gemini-3.1-flash-tts-preview';
  supportsCloning = false;

  private getGenAIClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required to use Gemini TTS provider. Please set GEMINI_API_KEY.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  private mapVoiceName(voiceId?: string, voiceProfile?: VoiceProfile, speakingStyle?: string): string {
    const vid = (voiceId || '').toLowerCase().trim();
    if (vid === 'fenrir') return 'Fenrir';
    if (vid === 'puck') return 'Puck';
    if (vid === 'charon') return 'Charon';
    if (vid === 'zephyr') return 'Zephyr';
    if (vid === 'kore') return 'Kore';
    if (vid === 'aoede') return 'Aoede';
    if (vid === 'leda') return 'Leda';
    if (vid === 'orpheus') return 'Orpheus';

    const raw = `${voiceId || ''} ${voiceProfile?.id || ''} ${voiceProfile?.name || ''} ${speakingStyle || ''}`.toLowerCase();
    if (raw.includes('fenrir') || raw.includes('authoritative') || raw.includes('motivational')) return 'Fenrir';
    if (raw.includes('puck') || raw.includes('youtube') || raw.includes('energetic')) return 'Puck';
    if (raw.includes('charon') || raw.includes('trailer') || raw.includes('epic') || raw.includes('dramatic')) return 'Charon';
    if (raw.includes('zephyr') || raw.includes('calm') || raw.includes('podcast')) return 'Zephyr';
    return 'Kore';
  }

  private pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
    const header = Buffer.alloc(44);
    const dataLength = pcmBuffer.length;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  private buildGeminiPrompt(text: string, speakingStyle?: string, temperature?: number): string {
    const style = (speakingStyle || 'Neutral').trim();
    let instruction = '';

    const lower = style.toLowerCase();
    if (lower.includes('dark') || lower.includes('gripping') || lower.includes('history')) {
      instruction = 'Deliver with a dark, gripping, and mysterious cadence with deliberate dramatic gravity:';
    } else if (lower.includes('authoritative') || lower.includes('documentary')) {
      instruction = 'Deliver with an authoritative, articulate, and objective documentary narrator voice:';
    } else if (lower.includes('energetic') || lower.includes('youtube') || lower.includes('fast')) {
      instruction = 'Deliver with high energy, enthusiasm, punchy articulation, and an upbeat tempo:';
    } else if (lower.includes('inspiring') || lower.includes('motivational')) {
      instruction = 'Deliver with an inspiring, deep, powerful, and motivational delivery:';
    } else if (lower.includes('intimate') || lower.includes('calm') || lower.includes('podcast')) {
      instruction = 'Deliver with a gentle, soothing, warm, and intimate storytelling tone:';
    } else if (style !== 'Neutral' && style !== 'Standard') {
      instruction = `Deliver in a ${style.toLowerCase()} tone and emotional cadence:`;
    }

    // Expressiveness modifier based on temperature
    if (temperature !== undefined) {
      if (temperature > 0.75) {
        instruction += ' Use rich emotional expressiveness and dynamic vocal inflection.';
      } else if (temperature < 0.45) {
        instruction += ' Maintain a steady, measured, and controlled cadence.';
      }
    }

    return instruction ? `${instruction.trim()}\n\n"${text}"` : text;
  }

  async processJob(job: TTSJob, voiceProfile?: VoiceProfile): Promise<TTSResult> {
    const ai = this.getGenAIClient();
    const voiceName = this.mapVoiceName(job.voice_id, voiceProfile, job.speaking_style);
    const promptText = job.processed_text || job.text;
    const prompt = this.buildGeminiPrompt(promptText, job.speaking_style, job.temperature);

    const temp = job.temperature !== undefined ? Math.max(0.0, Math.min(2.0, Number(job.temperature))) : 0.7;

    console.log(`[Gemini TTS Synthesis] Provider: ${this.id} | Model: ${this.model} | Voice: ${voiceName} | Speed: ${job.speed}x | Temp: ${temp} | Style: ${job.speaking_style || 'Neutral'}`);

    const response = await ai.models.generateContent({
      model: this.model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: temp,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Gemini TTS did not return audio data in response.");
    }

    const rawBuffer = Buffer.from(base64Audio, 'base64');
    let rawWavBuffer: Buffer;
    if (rawBuffer.length >= 4 && rawBuffer.toString('ascii', 0, 4) === 'RIFF') {
      rawWavBuffer = rawBuffer;
    } else {
      rawWavBuffer = this.pcmToWav(rawBuffer, 24000, 1, 16);
    }

    // Apply speed adjustment via FFmpeg audio processing to guarantee exact duration changes (e.g. 0.70x vs 1.30x)
    const targetSpeed = Number(job.speed) || 1.0;
    const { buffer: finalWavBuffer, duration: exactDuration } = await audioService.adjustAudioSpeed(
      rawWavBuffer,
      targetSpeed,
      24000
    );

    const durationSec = Math.max(1, Math.round(exactDuration));
    console.log(`[Gemini TTS Output] Duration: ${exactDuration.toFixed(2)}s (rounded: ${durationSec}s) at ${targetSpeed}x speed`);

    const postProcessing: string[] = [];
    if (Math.abs(targetSpeed - 1.0) >= 0.01) {
      postProcessing.push(`ffmpeg_atempo_${targetSpeed.toFixed(2)}x`);
    }
    postProcessing.push('pcm_to_wav_24000hz');

    const diagnostics: TTSDiagnostics = {
      provider_requested: job.provider,
      provider_executed: 'gemini',
      voice_id: job.voice_id,
      voice_name: `${voiceName} (Gemini Cloud Voice)`,
      is_custom_voice: false,
      fallback_used: false,
      final_synthesis_engine: 'Google Gemini Flash TTS (Native Audio)',
      speed: targetSpeed,
      speaking_style: job.speaking_style || 'Neutral',
      temperature: temp,
      repetition_penalty: job.repetition_penalty,
      language: job.language || 'en',
      native_speed_applied: false,
      native_temperature_applied: true,
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
  }

  async getStatus(): Promise<ProviderStatusInfo> {
    const hasKey = !!process.env.GEMINI_API_KEY;

    return {
      id: this.id,
      name: this.name,
      provider: 'Google DeepMind',
      model: this.model,
      status: hasKey ? 'active' : 'offline',
      gpu_available: true,
      inference_type: 'FREE CLOUD INFERENCE',
      pricing_status: 'Cloud API / Native Audio Generation',
      description: 'Google Gemini Flash Text-to-Speech providing high quality speech synthesis across multiple expressive voices.',
      supports_cloning: false,
      supported_languages: [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-cn', 'hi', 'ru', 'ar', 'nl', 'tr'
      ]
    };
  }
}

