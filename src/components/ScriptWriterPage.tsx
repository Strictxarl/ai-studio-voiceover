import React, { useState } from 'react';
import { Sparkles, Send, Copy, Check, Wand2, Clock, Film, Bookmark, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { ScriptWriterResult, GeminiVoiceId } from '../types';

interface ScriptWriterPageProps {
  onSendToVoiceover: (script: string, suggestedVoice?: GeminiVoiceId, suggestedPreset?: string) => void;
  onSendToDocumentary: (script: string, suggestedVoice?: GeminiVoiceId) => void;
}

const TOPIC_SUGGESTIONS = [
  'The Lost Library of Alexandria',
  'Origins of the Samurai & Bushido',
  'The Mariana Trench: What Lies in the Abyss',
  'The Psychology of Unstoppable Focus',
  'The Cold War Incident That Almost Ended Humanity',
  'How Quantum Computers Will Break the Internet'
];

export const ScriptWriterPage: React.FC<ScriptWriterPageProps> = ({
  onSendToVoiceover,
  onSendToDocumentary
}) => {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<'Documentary' | 'Dark History' | 'YouTube Short' | 'Podcast' | 'Motivational'>('Dark History');
  const [duration, setDuration] = useState<'30s' | '1m' | '3m' | '5m' | '10m'>('1m');
  const [audience, setAudience] = useState('');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScriptWriterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic or concept for your script.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      const res = await fetch('/api/tts/script-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          style,
          duration,
          audience: audience.trim() || undefined,
          notes: notes.trim() || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate script. Please verify server Gemini API key.');
      }

      const scriptData: ScriptWriterResult = await res.json();
      setResult(scriptData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Script generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.full_script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display flex items-center space-x-2">
            <Wand2 className="h-6 w-6 text-amber-400" />
            <span>AI Script Writer</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Generate cinema-grade narration scripts engineered with high-retention hooks, rich body pacing, and dramatic cliffhangers.
          </p>
        </div>
        <span className="self-start sm:self-auto rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 flex items-center space-x-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gemini 2.5 Flash Script Engine</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-4">
            
            {/* Topic Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Script Topic or Concept <span className="text-amber-400">*</span>
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. The mysterious disappearance of the Roman Ninth Legion in Scotland..."
                rows={3}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-sans"
              />

              {/* Quick Inspiration Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase text-zinc-500">Quick Inspirations:</span>
                <div className="flex flex-wrap gap-1.5">
                  {TOPIC_SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTopic(item)}
                      className="text-[10px] rounded-lg border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-zinc-400 hover:border-amber-500/50 hover:text-amber-300 transition text-left"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Narrative Style */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Narrative Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'Dark History', label: 'Dark History', desc: 'Mysterious & moody' },
                  { id: 'Documentary', label: 'Documentary', desc: 'Authoritative cinema' },
                  { id: 'YouTube Short', label: 'YouTube Short', desc: 'High retention hook' },
                  { id: 'Motivational', label: 'Motivational', desc: 'Inspiring & deep' },
                  { id: 'Podcast', label: 'Podcast', desc: 'Intimate storytelling' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      style === s.id
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm'
                        : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Target Audio Duration</span>
                </label>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Approx words: {duration === '30s' ? '~75' : duration === '1m' ? '~150' : duration === '3m' ? '~450' : duration === '5m' ? '~750' : '~1500'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {(['30s', '1m', '3m', '5m', '10m'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`py-2 rounded-xl border text-xs font-bold transition text-center ${
                      duration === d
                        ? 'border-amber-500 bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Target Audience (Optional)</label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. History buffs, TikTok viewers"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Creative Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Emphasize the shocking twist"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleGenerateScript}
              disabled={isGenerating || !topic.trim()}
              className={`w-full flex items-center justify-center space-x-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition shadow-lg ${
                isGenerating || !topic.trim()
                  ? 'border border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-950" />
                  <span>Drafting Cinematic Script with Gemini...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>GENERATE CINEMATIC SCRIPT</span>
                </>
              )}
            </button>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Generated Script Output */}
        <div className="lg:col-span-7 space-y-4">
          
          {result ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-5">
              
              {/* Header with Title & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {result.suggested_preset || style}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1 font-display">
                    {result.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                  <span className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">
                    {result.word_count || result.full_script.split(/\s+/).length} words
                  </span>
                  <span className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">
                    ~{result.estimated_duration_sec}s est.
                  </span>
                </div>
              </div>

              {/* Hook Section */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                    <span>🎣 Retentive Hook (0–5s)</span>
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 font-medium italic leading-relaxed">
                  "{result.hook}"
                </p>
              </div>

              {/* Main Body */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  📜 Main Narration Narrative
                </span>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-xs text-zinc-200 leading-relaxed space-y-3 whitespace-pre-line max-h-64 overflow-y-auto">
                  {result.body}
                </div>
              </div>

              {/* Cliffhanger / CTA */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  ⚡ Climax / Closing CTA
                </span>
                <p className="text-xs text-zinc-300 font-medium italic">
                  "{result.cta}"
                </p>
              </div>

              {/* Dispatch Action Buttons */}
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-400">Script Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Full Script</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onSendToDocumentary(result.full_script, result.suggested_gemini_voice)}
                    className="flex items-center space-x-1.5 rounded-xl border border-zinc-700 bg-zinc-800/90 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 hover:border-amber-500/40 hover:text-amber-400 transition"
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Send to Documentary</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSendToVoiceover(result.full_script, result.suggested_gemini_voice, result.suggested_preset)}
                    className="flex items-center space-x-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
                  >
                    <span>Send to Voiceover Studio</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full min-h-[380px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Wand2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No Script Generated Yet</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                Enter your topic on the left and select your desired tone. Gemini 2.5 Flash will craft a high-retention cinematic voiceover script ready to synthesize.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
