import { VoiceProvider } from './VoiceProvider.js';
import { ProviderStatusInfo } from '../../src/types.js';

export class GeminiProvider extends VoiceProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini TTS';
  public readonly model = 'gemini-2.5-flash-preview-tts';
  public readonly supportsCloning = false;

  public async getStatus(): Promise<ProviderStatusInfo> {
    return {
      id: this.id,
      name: this.name,
      provider: 'Google AI Studio',
      model: this.model,
      status: process.env.GEMINI_API_KEY ? 'online' : 'offline',
      gpu_available: true,
      inference_type: 'CLOUD API',
      pricing_status: 'Google Gemini API / Cloud TTS',
      description:
        'High-quality neural cloud text-to-speech voices from Google Gemini.',
      supports_cloning: this.supportsCloning,
      supported_languages: [
        'en',
        'es',
        'fr',
        'de',
        'it',
        'pt',
        'ja',
        'ko',
        'hi',
      ],
    };
  }
}
