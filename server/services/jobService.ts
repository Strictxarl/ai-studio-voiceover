import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import { TTSJob, TTSResult, WorkerInfo, JobStatus } from '../../src/types.js';
import { CONFIG } from '../config.js';
import { audioService } from './audioService.js';
import { voiceService } from './voiceService.js';
import { subtitleService } from './subtitleService.js';
import { generationRepository } from './generationRepository.js';

class JobService extends EventEmitter {
  private jobsFile = path.join(CONFIG.UPLOADS_DIR, 'jobs.json');
  private jobs: Map<string, TTSJob> = new Map();
  private workers: Map<string, WorkerInfo> = new Map();
  private pendingJobsQueue: string[] = [];

  constructor() {
    super();
    this.loadJobs();
    this.startWorkerCleanupInterval();
  }

  private loadJobs(): void {
    try {
      if (fs.existsSync(this.jobsFile)) {
        const data = fs.readFileSync(this.jobsFile, 'utf-8');
        const list: TTSJob[] = JSON.parse(data);
        list.forEach(j => {
          this.jobs.set(j.job_id, j);
          if (j.status === 'pending') {
            this.pendingJobsQueue.push(j.job_id);
          }
        });
      }
    } catch (e) {
      console.error('Failed loading jobs:', e);
    }
  }

  private saveJobs(): void {
    try {
      const list = Array.from(this.jobs.values());
      fs.writeFileSync(this.jobsFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed saving jobs:', e);
    }
  }

  private startWorkerCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, worker] of this.workers.entries()) {
        const lastHb = new Date(worker.last_heartbeat).getTime();
        if (now - lastHb > CONFIG.WORKER_TIMEOUT_MS) {
          worker.status = 'offline';
        }
      }
    }, 10000);
  }

  // --- Worker Management ---

  public registerWorker(workerData: Partial<WorkerInfo>): WorkerInfo {
    const worker_id = workerData.worker_id || `colab_worker_${Date.now()}`;
    const now = new Date().toISOString();

    const worker: WorkerInfo = {
      worker_id,
      status: 'online',
      gpu_name: workerData.gpu_name || 'NVIDIA GPU',
      vram_total_mb: workerData.vram_total_mb || 15360,
      vram_free_mb: workerData.vram_free_mb || 14000,
      cuda_version: workerData.cuda_version || '12.1',
      ram_total_mb: workerData.ram_total_mb || 12800,
      xtts_loaded: workerData.xtts_loaded ?? true,
      last_heartbeat: now,
      registered_at: now
    };

    this.workers.set(worker_id, worker);
    console.log(`[Worker] Worker ${worker_id} registered successfully (${worker.gpu_name})`);
    return worker;
  }

  public updateWorkerHeartbeat(worker_id: string, heartbeatData: Partial<WorkerInfo>): WorkerInfo | null {
    const worker = this.workers.get(worker_id);
    if (!worker) return null;

    worker.last_heartbeat = new Date().toISOString();
    worker.status = 'online';
    if (heartbeatData.vram_free_mb !== undefined) worker.vram_free_mb = heartbeatData.vram_free_mb;
    if (heartbeatData.xtts_loaded !== undefined) worker.xtts_loaded = heartbeatData.xtts_loaded;
    if (heartbeatData.status) worker.status = heartbeatData.status;

    return worker;
  }

  public getOnlineWorker(): WorkerInfo | null {
    const now = Date.now();
    for (const worker of this.workers.values()) {
      const lastHb = new Date(worker.last_heartbeat).getTime();
      if (now - lastHb <= CONFIG.WORKER_TIMEOUT_MS && worker.status !== 'offline') {
        return worker;
      }
    }
    return null;
  }

  public getAllWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  // --- Job Queue & Processing ---

  public async createJob(jobParams: {
    voice_id: string;
    text: string;
    title?: string;
    language?: string;
    provider?: string;
    preset?: string;
    speed?: number;
    speaking_style?: string;
    temperature?: number;
    repetition_penalty?: number;
    output_format?: 'wav' | 'mp3';
    is_documentary?: boolean;
  }): Promise<TTSJob> {
    const voice = voiceService.getVoiceById(jobParams.voice_id);
    if (!voice) {
      throw new Error(`Voice profile '${jobParams.voice_id}' not found.`);
    }

    // Preprocess text using pronunciation rules
    const processedText = audioService.applyPronunciationRules(jobParams.text, voice.pronunciation_dict);

    const job_id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const job: TTSJob = {
      job_id,
      status: 'pending',
      voice_id: voice.id,
      voice_name: voice.name,
      title: jobParams.title,
      text: jobParams.text,
      processed_text: processedText,
      language: jobParams.language || voice.language || 'en',
      provider: jobParams.provider || CONFIG.DEFAULT_VOICE_PROVIDER,
      preset: jobParams.preset,
      speed: jobParams.speed || 1.0,
      speaking_style: jobParams.speaking_style || 'Neutral',
      temperature: jobParams.temperature ?? 0.75,
      repetition_penalty: jobParams.repetition_penalty ?? 2.0,
      output_format: jobParams.output_format || 'wav',
      is_documentary: !!jobParams.is_documentary,
      created_at: now,
      updated_at: now,
      progress: 0
    };

    this.jobs.set(job_id, job);
    this.saveJobs();
    return job;
  }

  public async enqueueJob(job: TTSJob): Promise<void> {
    if (!this.pendingJobsQueue.includes(job.job_id)) {
      this.pendingJobsQueue.push(job.job_id);
    }
    this.emit('job_queued', job);
  }

  public getNextPendingJobForWorker(): TTSJob | null {
    if (this.pendingJobsQueue.length === 0) return null;
    const jobId = this.pendingJobsQueue.shift();
    if (!jobId) return null;

    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') return this.getNextPendingJobForWorker();

    job.status = 'processing';
    job.progress = 10;
    job.updated_at = new Date().toISOString();
    this.saveJobs();

    return job;
  }

  public async completeJobFromWorker(
    job_id: string,
    audioBuffer: Buffer,
    fileExtension: 'wav' | 'mp3' = 'wav',
    durationSec: number = 0,
    sampleRate: number = 24000
  ): Promise<TTSResult> {
    const job = this.jobs.get(job_id);
    if (!job) throw new Error(`Job '${job_id}' not found`);

    const outputFileName = `${job_id}.${fileExtension}`;
    const outputPath = path.join(CONFIG.AUDIO_DIR, outputFileName);
    fs.writeFileSync(outputPath, audioBuffer);

    // Also handle MP3 conversion if WAV was provided and MP3 format requested
    let mp3Url: string | undefined = undefined;
    let wavUrl: string = `/api/audio/${outputFileName}`;

    if (fileExtension === 'wav') {
      const mp3FileName = `${job_id}.mp3`;
      const mp3Path = path.join(CONFIG.AUDIO_DIR, mp3FileName);
      const mp3Success = await audioService.convertWavToMp3(outputPath, mp3Path);
      if (mp3Success) {
        mp3Url = `/api/audio/${mp3FileName}`;
      }
    } else {
      mp3Url = `/api/audio/${outputFileName}`;
    }

    const fileSize = fs.statSync(outputPath).size;
    const sha256 = await audioService.getFileSha256(outputPath);
    const calculatedDuration = durationSec > 0 ? durationSec : audioService.estimateTextDuration(job.text);

    // 1. Generate Subtitles (SRT + VTT with sentence segmentation & Whisper / smart timing)
    let subtitleSrtUrl: string | undefined = undefined;
    let subtitleVttUrl: string | undefined = undefined;
    try {
      const subResult = await subtitleService.generateSubtitles(
        outputPath,
        job.job_id,
        job.text,
        calculatedDuration
      );
      subtitleSrtUrl = subResult.srtUrl;
      subtitleVttUrl = subResult.vttUrl;
    } catch (subErr) {
      console.error(`[Subtitles] Failed generating subtitles for job ${job_id}:`, subErr);
    }

    // 2. Persist to SQLite Database via Prisma
    let generationId: string | undefined = undefined;
    try {
      const genRecord = await generationRepository.createGeneration({
        jobId: job.job_id,
        title: job.title || (job.text.length > 50 ? `${job.text.substring(0, 47)}...` : job.text),
        script: job.text,
        provider: job.provider,
        voiceId: job.voice_id,
        preset: job.preset,
        language: job.language,
        audioWavUrl: wavUrl,
        audioMp3Url: mp3Url,
        subtitleSrtUrl: subtitleSrtUrl,
        subtitleVttUrl: subtitleVttUrl,
        durationSeconds: calculatedDuration,
      });
      generationId = genRecord.id;
    } catch (dbErr) {
      console.error(`[Database] Failed to persist generation to SQLite for job ${job_id}:`, dbErr);
    }

    const result: TTSResult = {
      job_id,
      voice_id: job.voice_id,
      text: job.text,
      language: job.language,
      model: job.provider === 'xtts' ? 'coqui/XTTS-v2' : job.provider,
      duration: calculatedDuration,
      sample_rate: sampleRate,
      format: job.output_format,
      file_size: fileSize,
      sha256,
      created_at: new Date().toISOString(),
      audio_url: job.output_format === 'mp3' && mp3Url ? mp3Url : wavUrl,
      wav_url: wavUrl,
      mp3_url: mp3Url,
      subtitle_srt_url: subtitleSrtUrl,
      subtitle_vtt_url: subtitleVttUrl,
      generation_id: generationId,
    };

    job.status = 'completed';
    job.progress = 100;
    job.updated_at = new Date().toISOString();
    job.result = result;

    this.saveJobs();
    this.emit(`job_completed_${job_id}`, result);
    return result;
  }

  public failJob(job_id: string, errorMessage: string): void {
    const job = this.jobs.get(job_id);
    if (!job) return;

    job.status = 'failed';
    job.error_message = errorMessage;
    job.updated_at = new Date().toISOString();
    this.saveJobs();

    this.emit(`job_failed_${job_id}`, new Error(errorMessage));
  }

  public waitForJobCompletion(job_id: string, timeoutMs: number = 180000): Promise<TTSResult> {
    return new Promise((resolve, reject) => {
      const job = this.jobs.get(job_id);
      if (!job) {
        return reject(new Error(`Job '${job_id}' does not exist`));
      }

      if (job.status === 'completed' && job.result) {
        return resolve(job.result);
      }
      if (job.status === 'failed') {
        return reject(new Error(job.error_message || 'Job execution failed on GPU worker'));
      }

      const timer = setTimeout(() => {
        this.failJob(job_id, 'Job timed out waiting for worker execution');
        reject(new Error("Job timed out waiting for Colab GPU worker response. Ensure worker is active and listening."));
      }, timeoutMs);

      const onCompleted = (result: TTSResult) => {
        clearTimeout(timer);
        this.removeListener(`job_failed_${job_id}`, onFailed);
        resolve(result);
      };

      const onFailed = (err: Error) => {
        clearTimeout(timer);
        this.removeListener(`job_completed_${job_id}`, onCompleted);
        reject(err);
      };

      this.once(`job_completed_${job_id}`, onCompleted);
      this.once(`job_failed_${job_id}`, onFailed);
    });
  }

  public getJob(job_id: string): TTSJob | undefined {
    return this.jobs.get(job_id);
  }

  public getAllJobs(): TTSJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public deleteJob(job_id: string): boolean {
    const job = this.jobs.get(job_id);
    if (!job) {
      // Still try deleting from generation repository if present
      generationRepository.deleteGeneration(job_id).catch(() => {});
      return false;
    }

    if (job.result) {
      const wavPath = path.join(CONFIG.AUDIO_DIR, `${job_id}.wav`);
      const mp3Path = path.join(CONFIG.AUDIO_DIR, `${job_id}.mp3`);
      const srtPath = path.join(CONFIG.SUBTITLES_DIR, `${job_id}.srt`);
      const vttPath = path.join(CONFIG.SUBTITLES_DIR, `${job_id}.vtt`);
      if (fs.existsSync(wavPath)) try { fs.unlinkSync(wavPath); } catch (e) {}
      if (fs.existsSync(mp3Path)) try { fs.unlinkSync(mp3Path); } catch (e) {}
      if (fs.existsSync(srtPath)) try { fs.unlinkSync(srtPath); } catch (e) {}
      if (fs.existsSync(vttPath)) try { fs.unlinkSync(vttPath); } catch (e) {}
    }

    generationRepository.deleteGeneration(job_id).catch(err => {
      console.error(`Failed deleting generation record ${job_id} from SQLite:`, err);
    });

    this.jobs.delete(job_id);
    this.saveJobs();
    return true;
  }
}

export const jobService = new JobService();
