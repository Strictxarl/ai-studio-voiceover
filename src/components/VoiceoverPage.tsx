import React, { useState } from 'react';
import { Sparkles, Sliders, Globe, Volume2, BookOpen, AlertCircle, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { VoiceProfile, TTSJob, TTSResult, WorkerInfo } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { PronunciationModal } from './PronunciationModal';

interface VoiceoverPageProps {
  voices: VoiceProfile[];
  workerInfo: WorkerInfo | null;
  onGenerate: (params: {
    voice_id: string;
    text: string;
    language: string;
    provider: string;
    speed: number;
    speaking_style: string;
    temperature: number;
    repetition_penalty: number;
    output_format: 'wav' | 'mp3';
  }) => Promise<TTSResult>;
  onUpdatePronunciation: (voiceId: string, dict: Record<string, string>) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English (US/UK)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'cs', name: 'Czech (Čeština)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'zh-cn', name: 'Chinese (Mandarin)' },
  { code: 'hu', name: 'Hungarian (Magyar)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' }
];

export const VoiceoverPage: React.FC<VoiceoverPageProps> = ({
  voices,
  workerInfo,
  onGenerate,
  onUpdatePronunciation
}) => {
  const [script, setScript] = useState<string>(
    "History is filled with moments that changed the world forever. But sometimes, the most important stories are the ones we almost forgot."
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(voices[0]?.id || 'preset_doc_narration');
  const [language, setLanguage] = useState<string>('en');
  const [speed, setSpeed] = useState<number>(1.0);
  const [speakingStyle, setSpeakingStyle] = useState<string>('Neutral');
  const [temperature, setTemperature] = useState<number>(0.75);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number>(2.0);
  const [outputFormat, setOutputFormat] = useState<'wav' | 'mp3'>('wav');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TTSResult | null>(null);

  const [isPronunciationModalOpen, setIsPronunciationModalOpen] = useState<boolean>(false);

  const selectedVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];

  const charCount = script.length;
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estDurationSec = Math.max(1, Math.round((wordCount / 150) * 60));

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError('Please enter a script to generate voiceover.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationProgress(15);
    setCurrentStep('Preprocessing script & applying phonetics...');

    try {
      setGenerationProgress(35);
      setCurrentStep('Dispatching job to Coqui XTTS-v2 GPU worker...');

      const res = await onGenerate({
        voice_id: selectedVoiceId,
        text: script,
        language,
        provider: 'xtts',
        speed,
        speaking_style: speakingStyle,
        temperature,
        repetition_penalty: repetitionPenalty,
        output_format: outputFormat
      });

      setGenerationProgress(100);
      setCurrentStep('Generation completed successfully!');
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Speech generation failed. Ensure GPU worker is online.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display">AI Voiceover Studio</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Generate natural, cinematic speech with <strong className="text-amber-400">Coqui XTTS-v2</strong> voice cloning.
          </p>
        </div>

        {selectedVoice && (
          <button
            onClick={() => setIsPronunciationModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-amber-400 hover:border-amber-500/40 hover:bg-zinc-850 transition"
          >
            <BookOpen className="h-4 w-4" />
            <span>Pronunciation Rules ({Object.keys(selectedVoice.pronunciation_dict || {}).length})</span>
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Script Editor & Controls */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Text Area */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Voiceover Script
              </label>
              <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono">
                <span>{charCount} chars</span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">~{estDurationSec}s audio</span>
              </div>
            </div>

            <textarea
              rows={7}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste or type your script here..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-y"
            />

            {/* Disclaimer Permission Note */}
            <p className="text-[11px] text-zinc-500 italic flex items-center space-x-1">
              <span>* Notice: Voice cloning must only be used for voices you own or have explicit permission to use.</span>
            </p>
          </div>

          {/* Quick Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Voice Profile Selector */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Voice Profile</span>
                <span className="text-[10px] text-amber-400">{selectedVoice?.language.toUpperCase()}</span>
              </label>
              <select
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.metadata?.isPreset ? '(Preset)' : '(Cloned)'}
                  </option>
                ))}
              </select>
              {selectedVoice && (
                <p className="text-[11px] text-zinc-400 truncate pt-1">
                  {selectedVoice.description || 'Reference clip stored for XTTS-v2 cloning.'}
                </p>
              )}
            </div>

            {/* Language Selector */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <Globe className="h-3.5 w-3.5 text-amber-400" />
                <span>Multilingual Speech</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400 pt-1">
                XTTS-v2 maintains speaker tone across all 17 supported languages.
              </p>
            </div>

          </div>

          {/* Action Generate Button */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-sm font-extrabold text-zinc-950 shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Synthesizing Voice...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>GENERATE AI VOICEOVER</span>
                </>
              )}
            </button>
          </div>

          {/* Progress Tracker Bar */}
          {isGenerating && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-300">
                <span className="font-semibold">{currentStep}</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-xs text-red-300 space-y-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Generation Error</strong>
                  <span>{error}</span>
                </div>
              </div>

              {error.toLowerCase().includes('worker') && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 p-3 space-y-2 text-amber-200">
                  <div className="font-semibold text-xs text-amber-300 flex items-center justify-between">
                    <span>💡 How to connect your Colab GPU Worker:</span>
                    <a
                      href="/notebooks/xtts_colab_worker.ipynb"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline font-bold text-amber-400 hover:text-amber-300"
                    >
                      Download / Open Notebook ↗
                    </a>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] space-y-1 text-zinc-300">
                    <li>Open <a href="https://colab.research.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">colab.research.google.com</a></li>
                    <li>Upload <code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-300">xtts_colab_worker.ipynb</code></li>
                    <li>Set <strong>Runtime → Change runtime type → T4 GPU</strong></li>
                    <li>Run all cells (<code className="bg-zinc-900 px-1 py-0.5 rounded text-amber-300">Ctrl + F9</code>)</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Audio Output Preview */}
          {result && !isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                <span>Generated Output Audio</span>
              </div>
              <AudioPlayer result={result} />
            </div>
          )}

        </div>

        {/* Right Column: Generation Settings Sliders */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-5">
            
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
              <Sliders className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Acoustic Settings</h3>
            </div>

            {/* Speaking Style / Emotion */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex justify-between">
                <span>Speaking Style</span>
                <span className="text-amber-400 font-mono text-[11px]">{speakingStyle}</span>
              </label>
              <select
                value={speakingStyle}
                onChange={(e) => setSpeakingStyle(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="Neutral">Neutral / Standard</option>
                <option value="Enthusiastic">Enthusiastic / Upbeat</option>
                <option value="Serious">Serious / Documentary</option>
                <option value="Soft">Soft / Whisper</option>
                <option value="Dramatic">Dramatic Narration</option>
              </select>
            </div>

            {/* Speed Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Pacing / Speed</span>
                <span className="font-mono text-amber-400">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Temperature (Expressiveness)</span>
                <span className="font-mono text-amber-400">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-500">Higher values add expressiveness; lower values increase consistency.</p>
            </div>

            {/* Repetition Penalty Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Repetition Penalty</span>
                <span className="font-mono text-amber-400">{repetitionPenalty.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={10.0}
                step={0.5}
                value={repetitionPenalty}
                onChange={(e) => setRepetitionPenalty(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Output Format */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-xs font-medium text-zinc-300">Output Audio Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat('wav')}
                  className={`rounded-xl border py-2 text-xs font-semibold transition ${
                    outputFormat === 'wav'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  WAV (Lossless 24kHz)
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('mp3')}
                  className={`rounded-xl border py-2 text-xs font-semibold transition ${
                    outputFormat === 'mp3'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  MP3 (192kbps)
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Pronunciation Modal */}
      {selectedVoice && (
        <PronunciationModal
          voice={selectedVoice}
          isOpen={isPronunciationModalOpen}
          onClose={() => setIsPronunciationModalOpen(false)}
          onSave={onUpdatePronunciation}
        />
      )}

    </div>
  );
};
