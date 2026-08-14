import { VoiceProvider } from './VoiceProvider.js';
import { XTTSProvider } from './XTTSProvider.js';
import { OpenVoiceProvider } from './OpenVoiceProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { ProviderStatusInfo } from '../../src/types.js';

class ProviderRegistry {
  private providers: Map<string, VoiceProvider> = new Map();
  private defaultProviderId: string = process.env.DEFAULT_VOICE_PROVIDER || 'xtts';

  constructor() {
    this.registerProvider(new XTTSProvider());
    this.registerProvider(new OpenVoiceProvider());
  }

  public registerProvider(provider: VoiceProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id?: string): VoiceProvider {
    const targetId = id || this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      throw new Error(`Voice Provider '${targetId}' is not registered.`);
    }
    return provider;
  }

  public async getAllStatuses(): Promise<ProviderStatusInfo[]> {
    const statuses: ProviderStatusInfo[] = [];
    for (const provider of this.providers.values()) {
      try {
        const status = await provider.getStatus();
        statuses.push(status);
      } catch (e: any) {
        statuses.push({
          id: provider.id,
          name: provider.name,
          provider: 'Unknown',
          model: provider.model,
          status: 'error',
          gpu_available: false,
          inference_type: 'OPEN SOURCE MODEL',
          pricing_status: 'Unavailable',
          description: e.message || 'Error checking provider status',
          supports_cloning: provider.supportsCloning,
          supported_languages: []
        });
      }
    }
    return statuses;
  }
}

export const providerRegistry = new ProviderRegistry();
