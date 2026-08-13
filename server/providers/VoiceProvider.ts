import { TTSJob, VoiceProfile, TTSResult, ProviderStatusInfo } from '../../src/types.js';

export interface VoiceProvider {
  id: string;
  name: string;
  model: string;
  supportsCloning: boolean;
  
  /**
   * Process a TTS Job using this provider.
   * Note: For worker-backed models like XTTS-v2, the job is dispatched to Colab GPU worker queue.
   */
  processJob(job: TTSJob, voiceProfile?: VoiceProfile): Promise<TTSResult>;

  /**
   * Returns health, GPU status, and provider info
   */
  getStatus(): Promise<ProviderStatusInfo>;
}
