import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Layers, Clock, Zap, User, PlayCircle } from 'lucide-react';
import { VoiceProfile, TTSResult, WorkerInfo, GeminiVoiceId } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { ProviderSelector } from './ProviderSelector';
import { GEMINI_VOICES } from '../constants/presets';

interface DocumentaryPageProps {
  voices: VoiceProfile[];
  workerInfo: WorkerInfo | null;
  initialScript?: string;
  initialVoiceId?: string;
  onGenerateDocumentary: (params: {
    voice_id: string;
    script: string;
    language: string;
    provider: string;
    pause_duration_ms: number;
    speed?: number;
    speaking_style?: string;
    temperature?: number;
    repetition_penalty?: number;
  }) => Promise<TTSResult>;
  onOpenSharePage?: (jobId: string) => void;
}

export const DocumentaryPage: React.FC<DocumentaryPageProps> = ({
  voices,
  workerInfo,
  initialScript,
  initialVoiceId,
  onGenerateDocumentary,
  onOpenSharePage,
}) => {
  const [script, setScript] = useState<string>(
    initialScript ||
`Chapter 1: The Dawn of Classical Antiquity

History is filled with moments that changed the world forever. From the ancient river valleys of Mesopotamia to the marble halls of Athens, human civilization has continuously reshaped its own destiny.

Chapter 2: The Lost Archives

In the quiet corners of forgotten libraries, ancient manuscripts hold secrets that were lost to time. Scholars spent centuries deciphering texts written in languages that haven't been spoken aloud for millennia.

Chapter 3: The Unbroken Legacy

Today, modern technology allows us to reconstruct these voices and bring ancient narratives back to life. Through digital synthesis and neural audio modeling, the past speaks to us once again with unwavering clarity.`
  );

  const [provider, setProvider] = useState<string>('gemini');
  const [selectedGeminiVoice, setSelectedGeminiVoice] = useState<GeminiVoiceId>('kore');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(voices[0]?.id || 'preset_doc_narration');
  const [language, setLanguage] = useState<string>('en');
  const [pauseDurationMs, setPauseDurationMs] = useState<number>(850);
  const [speed, setSpeed] = useState<number>(0.95);
  const [speakingStyle, setSpeakingStyle] = useState<string>('Authoritative');
  const [temperature, setTemperature] = useState<number>(0.65);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TTSResult | null>(null);

  useEffect(() => {
    if (initialScript) setScript(initialScript);
    if (initialVoiceId && GEMINI_VOICES.some(v => v.id === initialVoiceId)) {
      setSelectedGeminiVoice(initialVoiceId as GeminiVoiceId);
    }
  }, [initialScript, initialVoiceId]);

  const paragraphs = script.split(/\n+/).filter(p => p.trim().length > 0);
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMin = Math.max(0.5, (wordCount / (150 * speed))).toFixed(1);
  const isGpuOnline = workerInfo && workerInfo.status !== 'offline';

  const handleGenerateDocumentary = async () => {
    if (!script.trim()) {
      setError('Please paste a long narration script.');
      return;
    }

    if (provider === 'xtts' && !isGpuOnline) {
      setError(
        'XTTS voice cloning requires the Google Colab GPU worker. Switch to Gemini Flash for instant cloud voice generation, or connect your Colab notebook.'
      );
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);
      setProgress(15);
      setStatusText(
        provider === 'gemini'
          ? `Chunking script for Google Gemini ${selectedGeminiVoice.toUpperCase()} TTS...`
          : 'Splitting script into paragraph chunks for XTTS-v2 GPU worker...'
      );

      const effectiveVoiceId = provider === 'gemini' ? selectedGeminiVoice : selectedVoiceId;

      const res = await onGenerateDocumentary({
        voice_id: effectiveVoiceId,
        script: script.trim(),
        language,
        provider,
        pause_duration_ms: pauseDurationMs,
        speed,
        speaking_style: speakingStyle,
        temperature,
        repetition_penalty: 2.0
      });

      setProgress(100);
      setStatusText('Concatenation completed successfully!');
      setResult(res);
    } catch (err: any) {
      console.error(err);
      if (provider === 'xtts') {
        setError(err.message || 'Documentary generation failed. Ensure GPU worker is online.');
      } else {
        setError(err.message || 'Documentary generation failed. Please verify your GEMINI_API_KEY.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-amber-400" />
            <span>Documentary Mode</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Automated batch chunking, multi-section synthesis, and seamless 800–1000ms pause concatenation for long-form narratives.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Script Input Column */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Provider Selection Card */}
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

          {/* Script Text Area */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <span>Full Documentary Script</span>
              </label>
              <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono">
                <span>{paragraphs.length} sections</span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">~{estimatedMin} min audio</span>
              </div>
            </div>

            <textarea
              rows={12}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your full 10-minute documentary script here..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none resize-y leading-relaxed font-sans"
            />
          </div>

          {/* Chunk Preview Accordion */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <PlayCircle className="h-4 w-4" />
                <span>Intelligent Chunk Breakdown ({paragraphs.length} audio sections)</span>
              </span>
              <span className="text-zinc-500">Auto-stitched with {pauseDurationMs}ms gap</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {paragraphs.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs text-zinc-300 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span className="text-amber-400 font-bold">Section {idx + 1}</span>
                    <span>{p.split(/\s+/).length} words</span>
                  </div>
                  <p className="line-clamp-2 italic text-zinc-400">"{p}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerateDocumentary}
            disabled={isGenerating}
            className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-sm font-extrabold text-zinc-950 shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Synthesizing Chunks & Merging Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>GENERATE FULL DOCUMENTARY NARRATION ({provider === 'gemini' ? `GEMINI ${selectedGeminiVoice.toUpperCase()}` : 'XTTS-V2'})</span>
              </>
            )}
          </button>

          {/* Progress Tracker */}
          {isGenerating && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-300">
                <span className="font-semibold">{statusText}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
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
                  <strong className="block font-semibold">Documentary Mode Notice</strong>
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
                    <li>To run without GPU, select <strong>Google Gemini Flash TTS</strong> above.</li>
                    <li>To clone custom voices with XTTS-v2, open <a href="/notebooks/xtts_colab_worker.ipynb" target="_blank" rel="noreferrer" className="text-amber-400 underline">xtts_colab_worker.ipynb</a> in Google Colab (T4 GPU).</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Output Preview */}
          {result && !isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                <span>Concatenated Narration Master Audio</span>
              </div>
              <AudioPlayer result={result} onOpenSharePage={onOpenSharePage} />
            </div>
          )}

        </div>

        {/* Settings Column */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-5">
            
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
              <Layers className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Concatenation Settings</h3>
            </div>

            {/* Narrator Voice Profile */}
            {provider === 'gemini' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-amber-400" />
                  <span>Gemini Studio Voice</span>
                </label>
                <select
                  value={selectedGeminiVoice}
                  onChange={(e) => setSelectedGeminiVoice(e.target.value as GeminiVoiceId)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {GEMINI_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.tone}
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
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">Narrator Voice Profile</label>
                <select
                  value={selectedVoiceId}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speaking Style / Emotion */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex justify-between items-center">
                <span>Documentary Tone</span>
                <span className="text-amber-400 font-mono text-[11px] font-bold">{speakingStyle}</span>
              </label>
              <select
                value={speakingStyle}
                onChange={(e) => setSpeakingStyle(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="Authoritative">Authoritative (Documentary / Science / History)</option>
                <option value="Dark & Gripping">Dark & Gripping (Crime / Mystery)</option>
                <option value="Inspiring">Inspiring (Motivational / Deep)</option>
                <option value="Intimate & Calm">Intimate & Calm (Storytelling / Nature)</option>
                <option value="Dramatic">Dramatic (High Stakes)</option>
              </select>
            </div>

            {/* Pacing / Speed */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span className="font-semibold">Narration Speed</span>
                <span className="font-mono text-amber-400 font-bold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.6}
                step={0.02}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0.6x (Deliberate)</span>
                <span>1.0x (Normal)</span>
                <span>1.6x (Brisk)</span>
              </div>
            </div>

            {/* Paragraph Pause Duration */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Inter-paragraph Pause</span>
                <span className="font-mono text-amber-400 font-bold">{pauseDurationMs} ms</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[500, 800, 950, 1200].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPauseDurationMs(val)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                      pauseDurationMs === val
                        ? 'border-amber-500 bg-amber-500 text-zinc-950 font-bold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {val}ms
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={200}
                max={1800}
                step={50}
                value={pauseDurationMs}
                onChange={(e) => setPauseDurationMs(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-500">
                Inserts silence padding between paragraph audio chunks for cinematic breathing.
              </p>
            </div>

            {/* Pipeline Overview */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 text-xs text-zinc-400">
              <div className="font-bold text-white uppercase text-[10px] tracking-wider text-amber-400">
                Automated Pipeline
              </div>
              <ol className="space-y-2 list-decimal list-inside text-[11px]">
                <li>Splits long text by sentence boundaries</li>
                <li>{provider === 'gemini' ? 'Gemini Flash' : 'XTTS-v2'} generates high-resolution chunks</li>
                <li>Pure PCM WAV buffers stitched with {pauseDurationMs}ms pauses</li>
                <li>Master file ready for instant download</li>
              </ol>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
