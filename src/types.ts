export interface VoiceProfile {
  id: string;
  name: string;
  engine?: 'f5-tts' | 'gemini' | 'xtts' | 'openvoice' | string;
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

export interface CustomVoice {
  id: string;
  name: string;
  engine: 'f5-tts' | string;
  reference_audio_path: string;
  reference_audio_url: string;
  created_at: string;
  language?: string;
  description?: string;
  duration?: number;
  file_size?: number;
  sample_rate?: number;
  pronunciation_dict?: Record<string, string>;
  metadata?: Record<string, any>;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TTSDiagnostics {
  provider_requested: string;
  provider_executed: string;
  voice_id: string;
  voice_name: string;
  is_custom_voice: boolean;
  reference_audio_path?: string;
  reference_audio_url?: string;
  reference_audio_exists?: boolean;
  reference_audio_duration_sec?: number;
  reference_audio_size_bytes?: number;
  fallback_used: boolean;
  fallback_provider?: string;
  final_synthesis_engine: string;
  speed: number;
  speaking_style: string;
  temperature: number;
  repetition_penalty: number;
  language: string;
  native_speed_applied: boolean;
  native_temperature_applied: boolean;
  native_repetition_penalty_applied: boolean;
  post_processing_applied: string[];
  exact_duration_seconds: number;
}

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
  subtitle_srt_url?: string;
  subtitle_vtt_url?: string;
  generation_id?: string;
  diagnostics?: TTSDiagnostics;
}

export interface GenerationRecord {
  id: string;
  jobId: string;
  title?: string | null;
  script: string;
  provider: string;
  voiceId: string;
  preset?: string | null;
  language: string;
  audioWavUrl?: string | null;
  audioMp3Url?: string | null;
  subtitleSrtUrl?: string | null;
  subtitleVttUrl?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TTSJob {
  job_id: string;
  status: JobStatus;
  voice_id: string;
  voice_name: string;
  title?: string;
  text: string;
  processed_text?: string;
  language: string;
  provider: string;
  preset?: string;
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
  diagnostics?: TTSDiagnostics;
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

export type GeminiVoiceId = 'kore' | 'fenrir' | 'charon' | 'zephyr' | 'puck';

export interface GeminiVoicePreset {
  id: GeminiVoiceId;
  name: string;
  gender: 'female' | 'male';
  tone: string;
  useCase: string;
  previewDescription: string;
}

export interface CinematicPreset {
  id: string;
  name: string;
  description: string;
  provider: 'gemini' | 'xtts' | 'openvoice';
  voice: GeminiVoiceId | string;
  speed: number;
  temperature: number;
  repetition_penalty: number;
  pause_duration_ms: number;
  speaking_style: string;
  iconName?: string;
}

export interface ScriptWriterRequest {
  topic: string;
  style: 'Documentary' | 'Dark History' | 'YouTube Short' | 'Podcast' | 'Motivational';
  duration: '30s' | '1m' | '3m' | '5m' | '10m';
  audience?: string;
  notes?: string;
}

export interface ScriptWriterResult {
  title: string;
  hook: string;
  body: string;
  cta: string;
  full_script: string;
  suggested_gemini_voice: GeminiVoiceId;
  suggested_preset: string;
  word_count: number;
  estimated_duration_sec: number;
}

