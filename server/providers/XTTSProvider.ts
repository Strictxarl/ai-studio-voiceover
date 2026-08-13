import { VoiceProvider } from './VoiceProvider.js';
import { TTSJob, VoiceProfile, TTSResult, ProviderStatusInfo } from '../../src/types.js';
import { jobService } from '../services/jobService.js';

export class XTTSProvider implements VoiceProvider {
  id = 'xtts';
  name = 'Coqui XTTS-v2';
  model = 'coqui/XTTS-v2';
  supportsCloning = true;

  async processJob(job: TTSJob, voiceProfile?: VoiceProfile): Promise<TTSResult> {
    const worker = jobService.getOnlineWorker();
    if (!worker) {
      throw new Error("Free GPU worker offline. Please start and connect the Google Colab GPU worker notebook to run XTTS-v2 voice inference.");
    }

    // Queue the job for worker pickup
    await jobService.enqueueJob(job);
    
    // Wait for completion via polling or job promise in jobService
    return await jobService.waitForJobCompletion(job.job_id);
  }

  async getStatus(): Promise<ProviderStatusInfo> {
    const worker = jobService.getOnlineWorker();
    const isOnline = !!worker;

    return {
      id: this.id,
      name: this.name,
      provider: 'Coqui / Hugging Face',
      model: this.model,
      status: isOnline ? 'active' : 'offline',
      gpu_available: isOnline,
      inference_type: 'FREE CLOUD INFERENCE',
      pricing_status: 'Free GPU via Google Colab / Self-hosted Cloud GPU',
      description: 'State-of-the-art multilingual voice cloning model supporting 17 languages with short 6-second reference audio.',
      supports_cloning: true,
      supported_languages: [
        'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 
        'cs', 'ar', 'zh-cn', 'hu', 'ko', 'ja', 'hi'
      ]
    };
  }
}
