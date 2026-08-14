import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { CONFIG } from '../config.js';

// Ensure data and uploads directories exist
fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
fs.mkdirSync(CONFIG.AUDIO_DIR, { recursive: true });
fs.mkdirSync(CONFIG.SUBTITLES_DIR, { recursive: true });
fs.mkdirSync(CONFIG.VOICES_DIR, { recursive: true });

let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export interface CreateGenerationInput {
  jobId: string;
  title?: string;
  script: string;
  provider: string;
  voiceId: string;
  preset?: string;
  language?: string;
  audioWavUrl?: string;
  audioMp3Url?: string;
  subtitleSrtUrl?: string;
  subtitleVttUrl?: string;
  durationSeconds?: number;
}

export class GenerationRepository {
  private get prisma() {
    return getPrisma();
  }

  async createGeneration(data: CreateGenerationInput) {
    try {
      const record = await this.prisma.generation.upsert({
        where: { jobId: data.jobId },
        update: {
          title: data.title,
          script: data.script,
          provider: data.provider,
          voiceId: data.voiceId,
          preset: data.preset,
          language: data.language || 'en',
          audioWavUrl: data.audioWavUrl,
          audioMp3Url: data.audioMp3Url,
          subtitleSrtUrl: data.subtitleSrtUrl,
          subtitleVttUrl: data.subtitleVttUrl,
          durationSeconds: data.durationSeconds,
        },
        create: {
          jobId: data.jobId,
          title: data.title,
          script: data.script,
          provider: data.provider,
          voiceId: data.voiceId,
          preset: data.preset,
          language: data.language || 'en',
          audioWavUrl: data.audioWavUrl,
          audioMp3Url: data.audioMp3Url,
          subtitleSrtUrl: data.subtitleSrtUrl,
          subtitleVttUrl: data.subtitleVttUrl,
          durationSeconds: data.durationSeconds,
        }
      });
      return record;
    } catch (error) {
      console.error('[GenerationRepository] createGeneration error:', error);
      throw error;
    }
  }

  async getGenerationById(idOrJobId: string) {
    try {
      // Find by id (cuid) or jobId
      const record = await this.prisma.generation.findFirst({
        where: {
          OR: [
            { id: idOrJobId },
            { jobId: idOrJobId }
          ]
        }
      });
      return record;
    } catch (error) {
      console.error('[GenerationRepository] getGenerationById error:', error);
      return null;
    }
  }

  async listRecentGenerations(limit: number = 50) {
    try {
      const records = await this.prisma.generation.findMany({
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });
      return records;
    } catch (error) {
      console.error('[GenerationRepository] listRecentGenerations error:', error);
      return [];
    }
  }

  async deleteGeneration(idOrJobId: string) {
    try {
      const record = await this.getGenerationById(idOrJobId);
      if (!record) return false;

      // Delete audio and subtitle files from disk
      const wavPath = path.join(CONFIG.AUDIO_DIR, `${record.jobId}.wav`);
      const mp3Path = path.join(CONFIG.AUDIO_DIR, `${record.jobId}.mp3`);
      const srtPath = path.join(CONFIG.SUBTITLES_DIR, `${record.jobId}.srt`);
      const vttPath = path.join(CONFIG.SUBTITLES_DIR, `${record.jobId}.vtt`);

      [wavPath, mp3Path, srtPath, vttPath].forEach(filePath => {
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      });

      await this.prisma.generation.delete({
        where: { id: record.id }
      });
      return true;
    } catch (error) {
      console.error('[GenerationRepository] deleteGeneration error:', error);
      return false;
    }
  }
}

export const generationRepository = new GenerationRepository();
