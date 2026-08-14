import fs from 'fs';
import path from 'path';
import { VoiceProfile, CustomVoice } from '../../src/types.js';
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
        list.forEach(v => {
          if (!v.engine) {
            v.engine = v.metadata?.isCloned ? 'f5-tts' : 'f5-tts';
          }
          this.voices.set(v.id, v);
        });
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
          id: 'custom_yusuf_narrator',
          name: 'Yusuf Narrator',
          engine: 'f5-tts',
          description: 'Deep, resonant cinematic voice with commanding presence and storytelling timbre.',
          reference_audio_path: path.join(CONFIG.VOICES_DIR, 'yusuf_narrator.wav'),
          reference_audio_url: '/api/voices/file/yusuf_narrator.wav',
          created_at: new Date().toISOString(),
          language: 'en',
          sample_rate: 24000,
          duration: 12,
          file_size: 576000,
          pronunciation_dict: {},
          metadata: { isCloned: true, isCustom: true, isPreset: true }
        },
        {
          id: 'custom_deep_doc_voice',
          name: 'Deep Documentary Voice',
          engine: 'f5-tts',
          description: 'Atmospheric, grave, and mysterious documentary narrator tone.',
          reference_audio_path: path.join(CONFIG.VOICES_DIR, 'deep_documentary.wav'),
          reference_audio_url: '/api/voices/file/deep_documentary.wav',
          created_at: new Date().toISOString(),
          language: 'en',
          sample_rate: 24000,
          duration: 14,
          file_size: 672000,
          pronunciation_dict: {
            'Babylon': 'Bab-i-lon',
            'Mesopotamia': 'Meso-po-tamia'
          },
          metadata: { isCloned: true, isCustom: true, isPreset: true }
        },
        {
          id: 'custom_podcast_intro',
          name: 'Podcast Intro Voice',
          engine: 'f5-tts',
          description: 'Engaging, warm, radio-broadcast ready voice for intros and podcasts.',
          reference_audio_path: path.join(CONFIG.VOICES_DIR, 'podcast_intro.wav'),
          reference_audio_url: '/api/voices/file/podcast_intro.wav',
          created_at: new Date().toISOString(),
          language: 'en',
          sample_rate: 24000,
          duration: 10,
          file_size: 480000,
          pronunciation_dict: {},
          metadata: { isCloned: true, isCustom: true, isPreset: true }
        },
        {
          id: 'preset_doc_narration',
          name: 'Clara - Warm Storyteller',
          engine: 'f5-tts',
          description: 'Warm, articulate, engaging storytelling voice.',
          reference_audio_path: path.join(CONFIG.VOICES_DIR, 'preset_clara.wav'),
          reference_audio_url: '/api/voices/file/preset_clara.wav',
          created_at: new Date().toISOString(),
          language: 'en',
          sample_rate: 24000,
          duration: 10,
          file_size: 480000,
          pronunciation_dict: {},
          metadata: { isPreset: true, isCloned: true }
        }
      ];

      // Create dummy audio files for presets if they don't exist yet
      for (const preset of defaultPresets) {
        const fileName = path.basename(preset.reference_audio_path);
        const fullPath = path.join(CONFIG.VOICES_DIR, fileName);
        if (!fs.existsSync(fullPath)) {
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

  public getCustomVoices(): VoiceProfile[] {
    return Array.from(this.voices.values()).filter(v => v.engine === 'f5-tts' || v.metadata?.isCloned || v.metadata?.isCustom);
  }

  public getVoiceById(id: string): VoiceProfile | undefined {
    return this.voices.get(id);
  }

  public async createVoiceProfile(
    name: string,
    description: string,
    filename: string,
    language: string = 'en',
    pronunciationDict?: Record<string, string>,
    engine: string = 'f5-tts'
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
      engine: engine || 'f5-tts',
      description,
      reference_audio_path: voicePath,
      reference_audio_url: voiceUrl,
      created_at: new Date().toISOString(),
      language: language || 'en',
      sample_rate: 24000,
      duration: Math.max(3, Math.round(fileSize / (24000 * 2)) || 6),
      file_size: fileSize,
      pronunciation_dict: pronunciationDict || {},
      metadata: {
        isCloned: true,
        isCustom: true,
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

