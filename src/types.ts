export interface VoiceProfile {
  id: string;
  name: string;
  description?: string;
  reference_audio_path: string;
  reference_audio_url: string;
  created_at: string;
  language: string;
  sample_rate?: number;
  duration?: number;
  file_size?: number;
  pronunciation_dict?: Record<string, string>;
  metadata?: Record<string, any>;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TTSResult {
  job_id: string;
  voice_id: string;
  text: string;
  language: string;
  model: string;
  duration: number;
  sample_rate: number;
  format: 'wav' | 'mp3';
  file_size: number;
  sha256: string;
  created_at: string;
  audio_url: string;
  wav_url?: string;
  mp3_url?: string;
}

export interface TTSJob {
  job_id: string;
  status: JobStatus;
  voice_id: string;
  voice_name: string;
  text: string;
  processed_text?: string;
  language: string;
  provider: string;
  speed: number;
  speaking_style?: string;
  temperature: number;
  repetition_penalty: number;
  output_format: 'wav' | 'mp3';
  is_documentary?: boolean;
  chunks_total?: number;
  chunks_completed?: number;
  created_at: string;
  updated_at: string;
  progress: number; // 0 to 100
  error_message?: string;
  result?: TTSResult;
}

export interface WorkerInfo {
  worker_id: string;
  status: 'online' | 'busy' | 'offline';
  gpu_name: string;
  vram_total_mb: number;
  vram_free_mb: number;
  cuda_version: string;
  ram_total_mb: number;
  xtts_loaded: boolean;
  last_heartbeat: string;
  registered_at: string;
  current_job_id?: string;
}

export type InferenceType = 'OPEN SOURCE MODEL' | 'FREE CLOUD INFERENCE' | 'PAID CLOUD INFERENCE';

export interface ProviderStatusInfo {
  id: string;
  name: string;
  provider: string;
  model: string;
  status: 'active' | 'offline' | 'error' | 'standby';
  gpu_available: boolean;
  inference_type: InferenceType;
  pricing_status: string;
  description: string;
  supports_cloning: boolean;
  supported_languages: string[];
}

export interface PronunciationRule {
  term: string;
  replacement: string;
}
