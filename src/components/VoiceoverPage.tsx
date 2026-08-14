import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, Globe, Volume2, BookOpen, AlertCircle, RefreshCw, CheckCircle2, Zap, Bookmark, SlidersHorizontal, User } from 'lucide-react';
import { VoiceProfile, TTSJob, TTSResult, WorkerInfo, GeminiVoiceId } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { PronunciationModal } from './PronunciationModal';
import { ProviderSelector } from './ProviderSelector';
import { GEMINI_VOICES, CINEMATIC_PRESETS } from '../constants/presets';

interface VoiceoverPageProps {
  voices: VoiceProfile[];
  workerInfo: WorkerInfo | null;
  initialScript?: string;
  initialVoiceId?: string;
  initialPreset?: string;
  onGenerate: (params: {
    voice_id: string;
    text: string;
    language: string;
    provider: string;
    preset?: string;
    speed: number;
    speaking_style: string;
    temperature: number;
    repetition_penalty: number;
    output_format: 'wav' | 'mp3';
  }) => Promise<TTSResult>;
  onUpdatePronunciation: (voiceId: string, dict: Record<string, string>) => void;
  onOpenSharePage?: (jobId: string) => void;
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
  initialScript,
  initialVoiceId,
  initialPreset,
  onGenerate,
  onUpdatePronunciation,
  onOpenSharePage,
}) => {
  const [script, setScript] = useState<string>(
    initialScript || "History is filled with moments that changed the world forever. But sometimes, the most important stories are the ones we almost forgot."
  );
  const [provider, setProvider] = useState<string>('gemini');
  const [selectedGeminiVoice, setSelectedGeminiVoice] = useState<GeminiVoiceId>('kore');
  const [selectedCustomVoiceId, setSelectedCustomVoiceId] = useState<string>(voices[0]?.id || 'preset_doc_narration');
  const [activePresetId, setActivePresetId] = useState<string | null>('dark-history');
  
  const [language, setLanguage] = useState<string>('en');
  const [speed, setSpeed] = useState<number>(0.92);
  const [speakingStyle, setSpeakingStyle] = useState<string>('Dark & Gripping');
  const [temperature, setTemperature] = useState<number>(0.55);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number>(1.7);
  const [outputFormat, setOutputFormat] = useState<'wav' | 'mp3'>('wav');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TTSResult | null>(null);

  const [isPronunciationModalOpen, setIsPronunciationModalOpen] = useState<boolean>(false);

  // Sync initial props when passed from ScriptWriterPage or My Voices
  useEffect(() => {
    if (initialScript) setScript(initialScript);
    if (initialVoiceId) {
      if (GEMINI_VOICES.some(v => v.id === initialVoiceId)) {
        setSelectedGeminiVoice(initialVoiceId as GeminiVoiceId);
        setProvider('gemini');
      } else if (voices.some(v => v.id === initialVoiceId)) {
        setSelectedCustomVoiceId(initialVoiceId);
        setProvider('f5-tts');
      }
    }
    if (initialPreset) {
      const match = CINEMATIC_PRESETS.find(p => p.name.toLowerCase() === initialPreset.toLowerCase());
      if (match) {
        applyPreset(match.id);
      }
    }
  }, [initialScript, initialVoiceId, initialPreset, voices]);

  const selectedCustomVoice = voices.find(v => v.id === selectedCustomVoiceId) || voices[0];
  const isGpuOnline = workerInfo && workerInfo.status !== 'offline';

  const charCount = script.length;
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estDurationSec = Math.max(1, Math.round((wordCount / (150 * speed)) * 60));

  const applyPreset = (presetId: string) => {
    const p = CINEMATIC_PRESETS.find(pr => pr.id === presetId);
    if (!p) return;
    setActivePresetId(presetId);
    setSpeed(p.speed);
    setTemperature(p.temperature);
    setRepetitionPenalty(p.repetition_penalty);
    setSpeakingStyle(p.speaking_style);

    if (p.provider === 'gemini') {
      setProvider('gemini');
      if (GEMINI_VOICES.some(v => v.id === p.voice)) {
        setSelectedGeminiVoice(p.voice as GeminiVoiceId);
      }
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError('Please enter a script to generate voiceover.');
      return;
    }

    if (provider === 'xtts' && !isGpuOnline) {
      setError(
        'XTTS voice cloning requires the Google Colab GPU worker. Switch to Gemini Flash or F5-TTS for instant voice generation, or connect your Colab notebook.'
      );
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationProgress(20);
    setCurrentStep(
      provider === 'gemini'
        ? `Preparing ${selectedGeminiVoice.toUpperCase()} voice with Gemini Flash Cloud TTS...`
        : provider === 'f5-tts'
        ? `Matching vocal profile with F5-TTS Neural Cloner...`
        : 'Preprocessing script & applying custom voice profile...'
    );

    try {
      setGenerationProgress(50);
      setCurrentStep(
        provider === 'gemini'
          ? 'Synthesizing voiceover with Google Gemini Flash...'
          : provider === 'f5-tts'
          ? 'Generating flow-matching audio with F5-TTS engine...'
          : 'Dispatching audio job to Coqui XTTS-v2 GPU worker...'
      );

      const effectiveVoiceId = provider === 'gemini' ? selectedGeminiVoice : selectedCustomVoiceId;

      const res = await onGenerate({
        voice_id: effectiveVoiceId,
        text: script,
        language,
        provider,
        preset: CINEMATIC_PRESETS.find(p => p.id === activePresetId)?.name || 'Documentary',
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
      if (provider === 'xtts') {
        setError(err.message || 'Speech generation failed. Ensure GPU worker is online.');
      } else {
        setError(err.message || 'Speech generation failed. Please verify your settings.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-amber-400" />
            <span>Voiceover Studio</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Produce cinema-grade narration with instant <strong className="text-amber-400">Gemini Flash Cloud TTS</strong> or zero-shot <strong className="text-amber-400">XTTS-v2</strong> voice cloning.
          </p>
        </div>

        {provider === 'xtts' && selectedCustomVoice && (
          <button
            onClick={() => setIsPronunciationModalOpen(true)}
            className="flex items-center space-x-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-amber-400 hover:border-amber-500/40 hover:bg-zinc-850 transition"
          >
            <BookOpen className="h-4 w-4" />
            <span>Pronunciation Rules ({Object.keys(selectedCustomVoice.pronunciation_dict || {}).length})</span>
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Script Editor & Controls */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Engine Selector */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-3">
            <ProviderSelector
              selectedProvider={provider}
              onSelectProvider={(p) => {
                setProvider(p);
                setError(null);
              }}
              workerInfo={workerInfo}
            />
          </div>

          {/* Cinematic Presets Bar */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                <span>Cinematic Presets</span>
              </label>
              <span className="text-[10px] text-zinc-500">1-click acoustic tuning</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {CINEMATIC_PRESETS.map((p) => {
                const isActive = activePresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                      isActive
                        ? 'border-amber-500 bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 font-bold'
                        : 'border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-950'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className={`text-[10px] opacity-80 ${isActive ? 'text-zinc-900 font-normal' : 'text-zinc-500'}`}>
                      ({p.speed}x)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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
              onChange={(e) => {
                setScript(e.target.value);
                setActivePresetId(null);
              }}
              placeholder="Paste or type your voiceover script here..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-y leading-relaxed"
            />
          </div>

          {/* Voice Character Picker & Multilingual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Voice Selection Card */}
            {provider === 'gemini' ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-amber-400" />
                    <span>Gemini Studio Voice</span>
                  </span>
                  <span className="text-[10px] text-amber-400 uppercase font-mono">{selectedGeminiVoice}</span>
                </label>

                <select
                  value={selectedGeminiVoice}
                  onChange={(e) => {
                    setSelectedGeminiVoice(e.target.value as GeminiVoiceId);
                    setActivePresetId(null);
                  }}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {GEMINI_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.tone} ({v.gender})
                    </option>
                  ))}
                </select>

                {(() => {
                  const curr = GEMINI_VOICES.find(v => v.id === selectedGeminiVoice);
                  return curr ? (
                    <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                      {curr.previewDescription}
                    </p>
                  ) : null;
                })()}
              </div>
            ) : (
              /* If F5-TTS or XTTS is selected: Show Cloned Voice Profiles with 🎤 icon */
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <span className="text-amber-400 text-sm">🎤</span>
                    <span>{provider === 'f5-tts' ? 'F5-TTS Cloned Voice' : 'XTTS Reference Voice'}</span>
                  </span>
                  <span className="text-[10px] text-amber-400 uppercase font-mono">
                    {provider.toUpperCase()}
                  </span>
                </label>
                <select
                  value={selectedCustomVoiceId}
                  onChange={(e) => setSelectedCustomVoiceId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {voices.map((v) => {
                    const iconPrefix = v.name.startsWith('🎤') ? '' : '🎤 ';
                    return (
                      <option key={v.id} value={v.id}>
                        {iconPrefix}{v.name} {v.metadata?.isPreset ? '(Library)' : '(Cloned)'}
                      </option>
                    );
                  })}
                </select>
                {selectedCustomVoice && (
                  <p className="text-[11px] text-zinc-400 truncate pt-1">
                    {selectedCustomVoice.description || 'Reference voice profile loaded for neural cloning.'}
                  </p>
                )}
              </div>
            )}

            {/* Language Selector */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <Globe className="h-3.5 w-3.5 text-amber-400" />
                <span>Language / Accent</span>
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
                {provider === 'gemini' 
                  ? 'High-fidelity cinematic synthesis across 17+ languages.' 
                  : provider === 'f5-tts'
                  ? 'F5-TTS neural flow matching preserves vocal timbre across languages.'
                  : 'XTTS-v2 maintains speaker voice identity cross-lingually.'}
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
                  <span>
                    GENERATE CINEMATIC VOICEOVER (
                    {provider === 'gemini'
                      ? `GEMINI ${selectedGeminiVoice.toUpperCase()}`
                      : provider === 'f5-tts'
                      ? `F5-TTS CLONING`
                      : 'XTTS-V2'}
                    )
                  </span>
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
                  <strong className="block font-semibold">Generation Notice</strong>
                  <span>{error}</span>
                </div>
              </div>

              {provider === 'xtts' && !isGpuOnline && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 p-3 space-y-2 text-amber-200">
                  <div className="font-semibold text-xs text-amber-300 flex items-center justify-between">
                    <span>💡 Options: Switch to Gemini Cloud or connect Colab:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProvider('gemini');
                        setError(null);
                      }}
                      className="text-[11px] underline font-bold text-amber-400 hover:text-amber-300"
                    >
                      Switch to Gemini Flash ↗
                    </button>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] space-y-1 text-zinc-300">
                    <li>To run instantly without GPU, select <strong>Google Gemini Flash TTS</strong> above.</li>
                    <li>To clone custom voices with XTTS-v2, open <a href="/notebooks/xtts_colab_worker.ipynb" target="_blank" rel="noreferrer" className="text-amber-400 underline">xtts_colab_worker.ipynb</a> in Google Colab (T4 GPU).</li>
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
              <AudioPlayer
                result={result}
                onOpenSharePage={onOpenSharePage}
                onRegenerateVoice={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}

        </div>

        {/* Right Column: Generation Settings Sliders */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Acoustic Controls</h3>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold">
                {provider.toUpperCase()}
              </span>
            </div>

            {/* Speaking Style / Emotion */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex justify-between items-center">
                <span>Speaking Style / Mood</span>
                <span className="text-amber-400 font-mono text-[11px] font-bold">{speakingStyle}</span>
              </label>
              <select
                value={speakingStyle}
                onChange={(e) => {
                  setSpeakingStyle(e.target.value);
                  setActivePresetId(null);
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-medium"
              >
                <option value="Dark & Gripping">Dark & Gripping (Crime / History / Mystery)</option>
                <option value="Authoritative">Authoritative (Documentary / Science / News)</option>
                <option value="Energetic">Energetic (YouTube / Viral Shorts / Upbeat)</option>
                <option value="Inspiring">Inspiring (Motivational / Deep Passion)</option>
                <option value="Intimate & Calm">Intimate & Calm (Storytelling / Meditation / Podcast)</option>
                <option value="Dramatic">Dramatic (Movie Trailer / High Stakes)</option>
                <option value="Neutral">Neutral / Standard Narration</option>
              </select>
              <p className="text-[10px] text-zinc-400 leading-tight">
                {provider === 'gemini' 
                  ? '⚡ Dynamically guides Gemini Flash natural-language emotional inflection and cadence.'
                  : provider === 'f5-tts'
                  ? '⚡ Conditions F5-TTS zero-shot flow matching with target emotional cadence.'
                  : '⚡ Transferred through XTTS-v2 emotion conditioning.'}
              </p>
            </div>

            {/* Speed Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span className="font-semibold">Pacing / Speed</span>
                <span className="font-mono text-amber-400 font-bold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.8}
                step={0.02}
                value={speed}
                onChange={(e) => {
                  setSpeed(parseFloat(e.target.value));
                  setActivePresetId(null);
                }}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0.5x (Slow)</span>
                <span>1.0x (Normal)</span>
                <span>1.8x (Fast)</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Physical audio time-stretch & pitch-preserved resampling ({((wordCount / (150 * speed)) * 60).toFixed(1)}s estimated).
              </p>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span className="font-semibold">Expressiveness / Temperature</span>
                <span className="font-mono text-amber-400 font-bold">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.2}
                step={0.05}
                value={temperature}
                onChange={(e) => {
                  setTemperature(parseFloat(e.target.value));
                  setActivePresetId(null);
                }}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400 leading-tight">
                {provider === 'gemini'
                  ? 'Modulates Gemini sampling temperature & emotional inflection range.'
                  : provider === 'xtts'
                  ? 'Controls XTTS-v2 acoustic sampling variance.'
                  : 'Modulates neural flow-matching variance.'}
              </p>
            </div>

            {/* Repetition Penalty Slider (Engine-aware) */}
            <div className={`space-y-2 rounded-xl p-3 border transition ${
              provider === 'xtts'
                ? 'border-zinc-800 bg-zinc-950/40'
                : 'border-zinc-800/40 bg-zinc-950/20 opacity-60'
            }`}>
              <div className="flex justify-between text-xs text-zinc-300 items-center">
                <span className="font-semibold flex items-center space-x-1.5">
                  <span>Repetition Penalty</span>
                  {provider !== 'xtts' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                      XTTS-v2 only
                    </span>
                  )}
                </span>
                <span className="font-mono text-amber-400 font-bold">{repetitionPenalty.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={5.0}
                step={0.1}
                disabled={provider !== 'xtts'}
                value={repetitionPenalty}
                onChange={(e) => {
                  setRepetitionPenalty(parseFloat(e.target.value));
                  setActivePresetId(null);
                }}
                className={`w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 ${
                  provider === 'xtts' ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                }`}
              />
              <p className="text-[10px] text-zinc-500 leading-tight">
                {provider === 'xtts'
                  ? 'Prevents loops and stutter in autoregressive XTTS-v2 cloning.'
                  : 'N/A for Gemini & F5-TTS (direct non-autoregressive speech synthesis).'}
              </p>
            </div>

            {/* Output Format */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-xs font-semibold text-zinc-300">Output Audio Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat('wav')}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    outputFormat === 'wav'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/10'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                  }`}
                >
                  WAV (Lossless 24kHz)
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('mp3')}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    outputFormat === 'mp3'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/10'
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
      {selectedCustomVoice && (
        <PronunciationModal
          voice={selectedCustomVoice}
          isOpen={isPronunciationModalOpen}
          onClose={() => setIsPronunciationModalOpen(false)}
          onSave={onUpdatePronunciation}
        />
      )}

    </div>
  );
};
