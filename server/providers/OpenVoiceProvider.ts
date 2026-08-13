import { VoiceProvider } from './VoiceProvider.js';
import { TTSJob, VoiceProfile, TTSResult, ProviderStatusInfo } from '../../src/types.js';
import { jobService } from '../services/jobService.js';

export class OpenVoiceProvider implements VoiceProvider {
  id = 'openvoice';
  name = 'Myshkin / OpenVoice v2';
  model = 'myshell-ai/OpenVoiceV2';
  supportsCloning = true;

  async processJob(job: TTSJob, voiceProfile?: VoiceProfile): Promise<TTSResult> {
    const worker = jobService.getOnlineWorker();
    if (!worker) {
      throw new Error("OpenVoice GPU worker is currently offline. Please connect an OpenVoice compatible GPU worker.");
    }

    // Queue for worker
    await jobService.enqueueJob(job);
    return await jobService.waitForJobCompletion(job.job_id);
  }

  async getStatus(): Promise<ProviderStatusInfo> {
    const worker = jobService.getOnlineWorker();
    const isOnline = !!worker && worker.gpu_name.toLowerCase().includes('openvoice');

    return {
      id: this.id,
      name: this.name,
      provider: 'MyShell AI',
      model: this.model,
      status: isOnline ? 'active' : 'standby',
      gpu_available: isOnline,
      inference_type: 'OPEN SOURCE MODEL',
      pricing_status: 'Open Source Model / Self-Hosted',
      description: 'Instant voice cloning model focusing on zero-shot tone color converter and expression control.',
      supports_cloning: true,
      supported_languages: ['en', 'zh-cn', 'es', 'fr', 'de', 'ja']
    };
  }
}
