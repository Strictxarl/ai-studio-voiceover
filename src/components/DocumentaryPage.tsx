import React, { useState } from 'react';
import { BookOpen, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Layers, Clock } from 'lucide-react';
import { VoiceProfile, TTSResult, WorkerInfo } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface DocumentaryPageProps {
  voices: VoiceProfile[];
  workerInfo: WorkerInfo | null;
  onGenerateDocumentary: (params: {
    voice_id: string;
    script: string;
    language: string;
    pause_duration_ms: number;
  }) => Promise<TTSResult>;
}

export const DocumentaryPage: React.FC<DocumentaryPageProps> = ({
  voices,
  workerInfo,
  onGenerateDocumentary
}) => {
  const [script, setScript] = useState<string>(
`Chapter 1: The Dawn of Classical Antiquity

History is filled with moments that changed the world forever. From the ancient river valleys of Mesopotamia to the marble halls of Athens, human civilization has continuously reshaped its own destiny.

Chapter 2: The Lost Archives

In the quiet corners of forgotten libraries, ancient manuscripts hold secrets that were lost to time. Scholars spent centuries deciphering texts written in languages that haven't been spoken aloud for millennia.

Chapter 3: The Unbroken Legacy

Today, modern technology allows us to reconstruct these voices and bring ancient narratives back to life. Through digital synthesis and neural audio modeling, the past speaks to us once again with unwavering clarity.`
  );

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(voices[0]?.id || 'preset_doc_narration');
  const [language, setLanguage] = useState<string>('en');
  const [pauseDurationMs, setPauseDurationMs] = useState<number>(500);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TTSResult | null>(null);

  const paragraphs = script.split(/\n+/).filter(p => p.trim().length > 0);
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMin = Math.max(0.5, (wordCount / 150)).toFixed(1);

  const handleGenerateDocumentary = async () => {
    if (!script.trim()) {
      setError('Please paste a long narration script.');
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);
      setProgress(10);
      setStatusText('Splitting script into paragraph chunks...');

      const res = await onGenerateDocumentary({
        voice_id: selectedVoiceId,
        script: script.trim(),
        language,
        pause_duration_ms: pauseDurationMs
      });

      setProgress(100);
      setStatusText('Concatenation completed successfully!');
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Documentary generation failed. Ensure GPU worker is online.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-display">Long-Script Documentary Mode</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Automated batch chunking, XTTS-v2 voice synthesis, and seamless FFmpeg audio concatenation for long narratives.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Script Input Column */}
        <div className="lg:col-span-8 space-y-5">
          
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <span>Full Documentary Script</span>
              </label>
              <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono">
                <span>{paragraphs.length} paragraphs</span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">~{estimatedMin} min narration</span>
              </div>
            </div>

            <textarea
              rows={12}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your full 10-minute documentary script here..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none resize-y"
            />
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
                <span>Generating Chunks & Concatenating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>GENERATE FULL DOCUMENTARY NARRATION</span>
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
                  <strong className="block font-semibold">Documentary Mode Error</strong>
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

          {/* Output Preview */}
          {result && !isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                <span>Concatenated Narration Master Audio</span>
              </div>
              <AudioPlayer result={result} />
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

            {/* Voice Profile */}
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

            {/* Paragraph Pause Duration */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>Inter-paragraph Pause</span>
                <span className="font-mono text-amber-400">{pauseDurationMs} ms</span>
              </div>
              <input
                type="range"
                min={200}
                max={1500}
                step={100}
                value={pauseDurationMs}
                onChange={(e) => setPauseDurationMs(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-500">
                Inserts silence padding between paragraph audio chunks for natural pacing.
              </p>
            </div>

            {/* Chunking Breakdown Info */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 text-xs text-zinc-400">
              <div className="font-bold text-white uppercase text-[10px] tracking-wider text-amber-400">
                Pipeline Overview
              </div>
              <ol className="space-y-2 list-decimal list-inside text-[11px]">
                <li>Script split into paragraph chunks</li>
                <li>XTTS-v2 generates each chunk in batch</li>
                <li>PCM audio buffers merged with pause gaps</li>
                <li>Final WAV & MP3 file exported</li>
              </ol>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
