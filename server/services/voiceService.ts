import fs from 'fs';
import path from 'path';
import { VoiceProfile } from '../../src/types.js';
import { CONFIG } from '../config.js';
import { audioService } from './audioService.js';

class VoiceService {
  private voicesFile = path.join(CONFIG.UPLOADS_DIR, 'voices.json');
  private voices: Map<string, VoiceProfile> = new Map();

  constructor() {
    this.loadVoices();
    this.ensureDefaultPresets();
  }

  private loadVoices(): void {
    try {
      if (fs.existsSync(this.voicesFile)) {
        const data = fs.readFileSync(this.voicesFile, 'utf-8');
        const list: VoiceProfile[] = JSON.parse(data);
        list.forEach(v => this.voices.set(v.id, v));
      }
    } catch (e) {
      console.error('Failed loading voice profiles:', e);
    }
  }

  private saveVoices(): void {
    try {
      const list = Array.from(this.voices.values());
      fs.writeFileSync(this.voicesFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed saving voice profiles:', e);
    }
  }

  private ensureDefaultPresets(): void {
    if (this.voices.size === 0) {
      const defaultPresets: VoiceProfile[] = [
        {
          id: 'preset_doc_narration',
          name: 'Documentary Master Voice',
          description: 'Deep, clear, cinematic documentary narration tone.',
          reference_audio_path: path.join(CONFIG.VOICES_DIR, 'preset_doc.wav'),
          reference_audio_url: '/api/voices/file/preset_doc.wav',
          created_at: new Date().toISOString(),
          language: 'en',
          sample_rate: 24000,
          duration: 12,
          file_size: 576000,
          pronunciation_dict: {
            'Yorùbá': 'Yoruba',
            'Babylon': 'Bab-i-lon',
            'Mesopotamia': 'Meso-po-tamia'
          },
          metadata: { isPreset: true }
        },
        {
          id: 'preset_narration_female',
          name: 'Clara - Warm Storyteller',
          description: 'Warm, articulate, engaging storytelling voice.',
          reference_audio_path: path.join(CONFIG.VOICES_DIR, 'preset_clara.wav'),
          reference_audio_url: '/api/voices/file/preset_clara.wav',
          created_at: new Date().toISOString(),
          language: 'en',
          sample_rate: 24000,
          duration: 10,
          file_size: 480000,
          pronunciation_dict: {},
          metadata: { isPreset: true }
        }
      ];

      // Create dummy audio files for presets if they don't exist yet
      for (const preset of defaultPresets) {
        const fileName = path.basename(preset.reference_audio_path);
        const fullPath = path.join(CONFIG.VOICES_DIR, fileName);
        if (!fs.existsSync(fullPath)) {
          // Generate minimal valid WAV reference
          this.createMinimalWavFile(fullPath, 24000, 3);
        }
        this.voices.set(preset.id, preset);
      }
      this.saveVoices();
    }
  }

  private createMinimalWavFile(filePath: string, sampleRate: number = 24000, durationSec: number = 3): void {
    const numChannels = 1;
    const bitsPerSample = 16;
    const totalSamples = sampleRate * durationSec;
    const pcmBytes = totalSamples * (bitsPerSample / 8);
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBytes, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmBytes, 40);

    // Generate gentle sine tone PCM data
    const pcmBuf = Buffer.alloc(pcmBytes);
    const freq = 220; // A3 note
    for (let i = 0; i < totalSamples; i++) {
      const sample = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 10000;
      pcmBuf.writeInt16LE(Math.floor(sample), i * 2);
    }

    fs.writeFileSync(filePath, Buffer.concat([header, pcmBuf]));
  }

  public getAllVoices(): VoiceProfile[] {
    return Array.from(this.voices.values());
  }

  public getVoiceById(id: string): VoiceProfile | undefined {
    return this.voices.get(id);
  }

  public async createVoiceProfile(
    name: string,
    description: string,
    filename: string,
    language: string = 'en',
    pronunciationDict?: Record<string, string>
  ): Promise<VoiceProfile> {
    const id = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const voicePath = path.join(CONFIG.VOICES_DIR, filename);
    const voiceUrl = `/api/voices/file/${filename}`;

    let fileSize = 0;
    if (fs.existsSync(voicePath)) {
      fileSize = fs.statSync(voicePath).size;
    }

    const profile: VoiceProfile = {
      id,
      name,
      description,
      reference_audio_path: voicePath,
      reference_audio_url: voiceUrl,
      created_at: new Date().toISOString(),
      language: language || 'en',
      sample_rate: 24000,
      duration: 8,
      file_size: fileSize,
      pronunciation_dict: pronunciationDict || {},
      metadata: {
        isCloned: true,
        original_filename: filename
      }
    };

    this.voices.set(id, profile);
    this.saveVoices();
    return profile;
  }

  public async updatePronunciationDict(voiceId: string, dict: Record<string, string>): Promise<VoiceProfile> {
    const voice = this.voices.get(voiceId);
    if (!voice) throw new Error("Voice profile not found");

    voice.pronunciation_dict = dict;
    this.saveVoices();
    return voice;
  }

  public deleteVoice(id: string): boolean {
    const voice = this.voices.get(id);
    if (!voice) return false;

    // Remove reference file if not preset
    if (!voice.metadata?.isPreset && fs.existsSync(voice.reference_audio_path)) {
      try {
        fs.unlinkSync(voice.reference_audio_path);
      } catch (e) {
        console.warn("Could not delete reference audio file:", e);
      }
    }

    this.voices.delete(id);
    this.saveVoices();
    return true;
  }
}

export const voiceService = new VoiceService();
