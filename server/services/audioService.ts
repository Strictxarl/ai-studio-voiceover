import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CONFIG } from '../config.js';

const execAsync = promisify(exec);

export class AudioService {
  constructor() {
    this.ensureDirectories();
  }

  public ensureDirectories(): void {
    if (!fs.existsSync(CONFIG.UPLOADS_DIR)) fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG.VOICES_DIR)) fs.mkdirSync(CONFIG.VOICES_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG.AUDIO_DIR)) fs.mkdirSync(CONFIG.AUDIO_DIR, { recursive: true });
  }

  /**
   * Calculates SHA-256 hash of a file
   */
  public async getFileSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', err => reject(err));
    });
  }

  /**
   * Preprocesses script text using custom pronunciation dictionary
   */
  public applyPronunciationRules(text: string, rules?: Record<string, string>): string {
    if (!rules || Object.keys(rules).length === 0) return text;

    let processed = text;
    for (const [term, replacement] of Object.entries(rules)) {
      if (!term || !replacement) continue;
      // Regex replace case-insensitive whole word or substring
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      processed = processed.replace(regex, replacement);
    }
    return processed;
  }

  /**
   * Split long text into documentary script chunks (max ~300 chars, split by sentences or paragraphs)
   */
  public splitDocumentaryScript(text: string, maxChunkLength: number = 300): string[] {
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    const chunks: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.length <= maxChunkLength) {
        chunks.push(paragraph.trim());
      } else {
        // Split paragraph by sentences
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let currentChunk = '';

        for (const sentence of sentences) {
          if ((currentChunk + ' ' + sentence).length <= maxChunkLength) {
            currentChunk = currentChunk ? `${currentChunk} ${sentence.trim()}` : sentence.trim();
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence.trim();
          }
        }
        if (currentChunk) chunks.push(currentChunk);
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Concatenates multiple WAV audio files into a single WAV file
   * Supports pure Node PCM RIFF header stitching & FFmpeg fallback
   */
  public async concatenateWavFiles(inputFiles: string[], outputFile: string, pauseDurationMs: number = 400): Promise<void> {
    if (inputFiles.length === 0) throw new Error("No input files provided for concatenation");
    if (inputFiles.length === 1) {
      fs.copyFileSync(inputFiles[0], outputFile);
      return;
    }

    // Attempt FFmpeg concatenation first if available
    try {
      const listFile = path.join(CONFIG.AUDIO_DIR, `concat_${Date.now()}.txt`);
      const fileListContent = inputFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
      fs.writeFileSync(listFile, fileListContent, 'utf-8');

      await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`);
      if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
      if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 100) {
        return;
      }
    } catch (e) {
      // Fallback to pure Node RIFF PCM concatenation
      console.log('FFmpeg concat failed or unavailable, using pure Node WAV PCM stitcher');
    }

    // Pure Node WAV concatenation
    const wavBuffers: Buffer[] = [];
    let sampleRate = 24000;
    let numChannels = 1;
    let bitsPerSample = 16;

    for (let i = 0; i < inputFiles.length; i++) {
      const buf = fs.readFileSync(inputFiles[i]);
      if (buf.length < 44) continue; // Invalid WAV

      // Parse header parameters from first valid file
      if (i === 0) {
        numChannels = buf.readUInt16LE(22);
        sampleRate = buf.readUInt32LE(24);
        bitsPerSample = buf.readUInt16LE(34);
      }

      // Extract raw audio data after header (skip 44 bytes RIFF header)
      const pcmData = buf.subarray(44);
      wavBuffers.push(pcmData);

      // Add silence buffer between chunks if not last chunk
      if (i < inputFiles.length - 1 && pauseDurationMs > 0) {
        const bytesPerSecond = sampleRate * numChannels * (bitsPerSample / 8);
        const silenceBytes = Math.floor((pauseDurationMs / 1000) * bytesPerSecond);
        // Ensure even alignment for 16-bit
        const alignedSilenceBytes = silenceBytes - (silenceBytes % (numChannels * (bitsPerSample / 8)));
        const silenceBuf = Buffer.alloc(alignedSilenceBytes);
        wavBuffers.push(silenceBuf);
      }
    }

    const totalPcmLength = wavBuffers.reduce((acc, b) => acc + b.length, 0);
    const headerBuf = Buffer.alloc(44);

    // Write RIFF Header
    headerBuf.write('RIFF', 0);
    headerBuf.writeUInt32LE(36 + totalPcmLength, 4);
    headerBuf.write('WAVE', 8);
    headerBuf.write('fmt ', 12);
    headerBuf.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    headerBuf.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    headerBuf.writeUInt16LE(numChannels, 22);
    headerBuf.writeUInt32LE(sampleRate, 24);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    headerBuf.writeUInt32LE(byteRate, 28);
    const blockAlign = numChannels * (bitsPerSample / 8);
    headerBuf.writeUInt16LE(blockAlign, 32);
    headerBuf.writeUInt16LE(bitsPerSample, 34);
    headerBuf.write('data', 36);
    headerBuf.writeUInt32LE(totalPcmLength, 40);

    const fullWav = Buffer.concat([headerBuf, ...wavBuffers]);
    fs.writeFileSync(outputFile, fullWav);
  }

  /**
   * Convert WAV file to MP3
   */
  public async convertWavToMp3(wavPath: string, mp3Path: string): Promise<boolean> {
    try {
      await execAsync(`ffmpeg -y -i "${wavPath}" -vn -ar 44100 -ac 2 -b:a 192k "${mp3Path}"`);
      return fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 0;
    } catch (e) {
      console.warn("FFmpeg MP3 conversion unavailable or failed:", e);
      return false;
    }
  }

  /**
   * Calculates precise duration of a WAV buffer or file in seconds
   */
  public getWavDuration(input: Buffer | string): number {
    try {
      const buf = typeof input === 'string' ? fs.readFileSync(input) : input;
      if (buf.length < 44) return 0;
      const numChannels = buf.readUInt16LE(22) || 1;
      const sampleRate = buf.readUInt32LE(24) || 24000;
      const bitsPerSample = buf.readUInt16LE(34) || 16;
      const dataSize = Math.max(0, buf.length - 44);
      const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
      if (byteRate <= 0) return 0;
      return dataSize / byteRate;
    } catch {
      return 0;
    }
  }

  /**
   * Generates FFmpeg atempo filter string (chains atempo for values outside 0.5-2.0)
   */
  private buildAtempoFilter(speed: number): string {
    const clamped = Math.max(0.25, Math.min(4.0, speed));
    let remaining = clamped;
    const filters: string[] = [];

    while (remaining > 2.0) {
      filters.push('atempo=2.0');
      remaining /= 2.0;
    }
    while (remaining < 0.5) {
      filters.push('atempo=0.5');
      remaining /= 0.5;
    }
    if (Math.abs(remaining - 1.0) > 0.005 || filters.length === 0) {
      filters.push(`atempo=${remaining.toFixed(4)}`);
    }

    return filters.join(',');
  }

  /**
   * Adjusts audio speed / playback rate with pitch preservation using FFmpeg
   */
  public async adjustAudioSpeed(
    inputBuffer: Buffer,
    speed: number = 1.0,
    sampleRate: number = 24000
  ): Promise<{ buffer: Buffer; duration: number }> {
    const targetSpeed = Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
    
    // If speed is practically 1.0x, return original buffer
    if (Math.abs(targetSpeed - 1.0) < 0.01) {
      const dur = this.getWavDuration(inputBuffer);
      return { buffer: inputBuffer, duration: dur };
    }

    const tmpIn = path.join(CONFIG.AUDIO_DIR, `tmp_speed_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.wav`);
    const tmpOut = path.join(CONFIG.AUDIO_DIR, `tmp_speed_out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.wav`);

    try {
      fs.writeFileSync(tmpIn, inputBuffer);
      const filter = this.buildAtempoFilter(targetSpeed);
      await execAsync(`ffmpeg -y -i "${tmpIn}" -filter:a "${filter}" -ar ${sampleRate} "${tmpOut}"`);

      if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 44) {
        const outBuf = fs.readFileSync(tmpOut);
        const duration = this.getWavDuration(outBuf);
        return { buffer: outBuf, duration };
      }
    } catch (err) {
      console.warn(`[AudioService] FFmpeg speed adjustment failed (${targetSpeed}x):`, err);
    } finally {
      if (fs.existsSync(tmpIn)) try { fs.unlinkSync(tmpIn); } catch {}
      if (fs.existsSync(tmpOut)) try { fs.unlinkSync(tmpOut); } catch {}
    }

    // Fallback if FFmpeg failed
    const fallbackDur = this.getWavDuration(inputBuffer) / targetSpeed;
    return { buffer: inputBuffer, duration: fallbackDur };
  }

  /**
   * Estimate duration in seconds from text length (roughly 150 words / minute)
   */
  public estimateTextDuration(text: string, speed: number = 1.0): number {
    const wordCount = text.trim().split(/\s+/).length;
    const effectiveSpeed = Math.max(0.5, Number(speed) || 1.0);
    const minutes = wordCount / (150 * effectiveSpeed);
    return Math.max(1, Math.round(minutes * 60));
  }
}

export const audioService = new AudioService();
