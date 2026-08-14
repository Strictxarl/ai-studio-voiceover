import { GoogleGenAI, Modality } from '@google/genai';
import { VoiceProvider } from './VoiceProvider.js';
import { TTSJob, VoiceProfile, TTSResult, ProviderStatusInfo } from '../../src/types.js';
import { jobService } from '../services/jobService.js';

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

  private mapVoiceName(voiceId?: string, voiceProfile?: VoiceProfile, speakingStyle?: string): 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' {
    const raw = `${voiceId || ''} ${voiceProfile?.id || ''} ${voiceProfile?.name || ''} ${speakingStyle || ''}`.toLowerCase();
    
    if (raw.includes('fenrir') || raw.includes('deep') || raw.includes('male') || raw.includes('authoritative') || raw.includes('motivational')) return 'Fenrir';
    if (raw.includes('puck') || raw.includes('youtube') || raw.includes('energetic') || raw.includes('playful') || raw.includes('cheerful')) return 'Puck';
    if (raw.includes('charon') || raw.includes('trailer') || raw.includes('epic') || raw.includes('serious') || raw.includes('news') || raw.includes('dramatic')) return 'Charon';
    if (raw.includes('zephyr') || raw.includes('calm') || raw.includes('meditation') || raw.includes('gentle') || raw.includes('podcast') || raw.includes('story')) return 'Zephyr';
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

  async processJob(job: TTSJob, voiceProfile?: VoiceProfile): Promise<TTSResult> {
    const ai = this.getGenAIClient();
    const voiceName = this.mapVoiceName(job.voice_id, voiceProfile, job.speaking_style);

    const promptText = job.processed_text || job.text;
    const prompt = job.speaking_style && job.speaking_style !== 'Neutral'
      ? `Say in a ${job.speaking_style.toLowerCase()} tone: ${promptText}`
      : promptText;

    const response = await ai.models.generateContent({
      model: this.model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
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
    let wavBuffer: Buffer;
    if (rawBuffer.length >= 4 && rawBuffer.toString('ascii', 0, 4) === 'RIFF') {
      wavBuffer = rawBuffer;
    } else {
      wavBuffer = this.pcmToWav(rawBuffer, 24000, 1, 16);
    }

    const durationSec = Math.max(1, Math.round(rawBuffer.length / (24000 * 2)));
    return await jobService.completeJobFromWorker(
      job.job_id,
      wavBuffer,
      'wav',
      durationSec,
      24000
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
