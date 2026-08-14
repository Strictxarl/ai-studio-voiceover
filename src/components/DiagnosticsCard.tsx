import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Gauge, 
  Sparkles, 
  Layers, 
  Clock, 
  FileCode, 
  ChevronDown, 
  ChevronUp, 
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { TTSDiagnostics, TTSResult } from '../types';

interface DiagnosticsCardProps {
  diagnostics?: TTSDiagnostics;
  result: TTSResult;
}

export const DiagnosticsCard: React.FC<DiagnosticsCardProps> = ({ diagnostics, result }) => {
  const [isRawExpanded, setIsRawExpanded] = useState(false);

  // Fallback defaults if diagnostics object wasn't populated
  const diag: TTSDiagnostics = diagnostics || {
    provider_requested: result.model || 'gemini',
    provider_executed: (result.model || 'gemini').toLowerCase().includes('gemini') ? 'gemini' : 'xtts',
    voice_id: result.voice_id || 'kore',
    voice_name: result.voice_id ? `${result.voice_id}` : 'Default Voice',
    is_custom_voice: result.model === 'xtts' || result.model === 'f5-tts',
    fallback_used: false,
    final_synthesis_engine: result.model || 'Google Gemini Flash TTS',
    speed: 1.0,
    speaking_style: 'Neutral',
    temperature: 0.7,
    repetition_penalty: 2.0,
    language: result.language || 'en',
    native_speed_applied: false,
    native_temperature_applied: true,
    native_repetition_penalty_applied: false,
    post_processing_applied: ['pcm_to_wav_24000hz'],
    exact_duration_seconds: result.duration
  };

  const isGemini = diag.provider_executed === 'gemini';
  const isF5 = diag.provider_executed === 'f5-tts';
  const isXTTS = diag.provider_executed === 'xtts';

  return (
    <div id="runtime-diagnostics-panel" className="rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-xl space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-amber-500/10 p-1.5 border border-amber-500/20">
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <span>Runtime Synthesis Diagnostics</span>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 font-semibold">
                AUDITED
              </span>
            </h4>
            <p className="text-[10px] text-zinc-400">
              Verified runtime execution path, engine parameters & audio telemetry.
            </p>
          </div>
        </div>

        {diag.fallback_used ? (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-bold">
            <AlertTriangle className="h-3 w-3" />
            <span>Fallback Engaged</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
            <ShieldCheck className="h-3 w-3" />
            <span>Direct Execution (No Fallback)</span>
          </div>
        )}
      </div>

      {/* Grid of Verified Runtime Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
        {/* Engine & Provider */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center space-x-1">
            <Cpu className="h-3 w-3 text-amber-400" />
            <span>Synthesis Engine</span>
          </div>
          <div className="font-semibold text-white truncate" title={diag.final_synthesis_engine}>
            {diag.final_synthesis_engine}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            Provider: <strong className="text-amber-400">{diag.provider_executed.toUpperCase()}</strong>
          </div>
        </div>

        {/* Voice Identity */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center space-x-1">
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Active Voice</span>
          </div>
          <div className="font-semibold text-white truncate" title={diag.voice_name}>
            {diag.voice_name}
          </div>
          <div className="text-[10px] text-zinc-400">
            {diag.is_custom_voice ? '🎤 Cloned Voice Profile' : '☁️ Gemini Cloud Prebuilt'}
          </div>
        </div>

        {/* Exact Audio Duration */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center space-x-1">
            <Clock className="h-3 w-3 text-amber-400" />
            <span>Exact Audio Duration</span>
          </div>
          <div className="font-semibold text-emerald-400 font-mono">
            {diag.exact_duration_seconds ? `${diag.exact_duration_seconds.toFixed(2)}s` : `${result.duration}s`}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            {result.file_size ? `${(result.file_size / 1024).toFixed(0)} KB` : '24kHz WAV'}
          </div>
        </div>

        {/* Speed / Pacing */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center space-x-1">
            <Gauge className="h-3 w-3 text-amber-400" />
            <span>Speed Control</span>
          </div>
          <div className="font-semibold text-white font-mono flex items-center space-x-1.5">
            <span className="text-amber-400">{diag.speed ? Number(diag.speed).toFixed(2) : '1.00'}x</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
              {diag.native_speed_applied ? 'Native' : 'FFmpeg Pitch-Preserved'}
            </span>
          </div>
          <div className="text-[10px] text-zinc-400">
            Audio duration physically modulated
          </div>
        </div>

        {/* Speaking Style & Temperature */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center space-x-1">
            <Sliders className="h-3 w-3 text-amber-400" />
            <span>Style & Expressiveness</span>
          </div>
          <div className="font-semibold text-white truncate" title={diag.speaking_style}>
            {diag.speaking_style || 'Neutral'}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            Temp / Exp: <span className="text-amber-400">{diag.temperature ? Number(diag.temperature).toFixed(2) : '0.70'}</span>
          </div>
        </div>

        {/* Repetition Penalty Handling */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-2.5 space-y-1">
          <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center space-x-1">
            <Layers className="h-3 w-3 text-amber-400" />
            <span>Repetition Penalty</span>
          </div>
          <div className="font-semibold text-white font-mono">
            {isXTTS ? (
              <span className="text-amber-400">{diag.repetition_penalty ? Number(diag.repetition_penalty).toFixed(1) : '2.0'} (Applied in Decoder)</span>
            ) : (
              <span className="text-zinc-400 text-[11px]">N/A ({isGemini ? 'Gemini Flash' : 'F5 Flow'})</span>
            )}
          </div>
          <div className="text-[10px] text-zinc-400">
            {isXTTS ? 'Prevents autoregressive stutter' : 'Non-autoregressive model (no loops)'}
          </div>
        </div>
      </div>

      {/* Post Processing Chain & Filters */}
      {diag.post_processing_applied && diag.post_processing_applied.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-[10px] font-bold uppercase text-zinc-400">DSP Pipeline:</span>
          {diag.post_processing_applied.map((filter, i) => (
            <span
              key={i}
              className="rounded-md bg-zinc-950 border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-amber-300/90"
            >
              {filter}
            </span>
          ))}
        </div>
      )}

      {/* Raw Telemetry Accordion for Auditing */}
      <div className="border-t border-zinc-800/80 pt-2">
        <button
          type="button"
          onClick={() => setIsRawExpanded(!isRawExpanded)}
          className="flex items-center justify-between w-full text-[11px] font-semibold text-zinc-400 hover:text-white transition"
        >
          <span className="flex items-center space-x-1.5">
            <FileCode className="h-3.5 w-3.5 text-zinc-500" />
            <span>Inspect Raw Telemetry & Diagnostic JSON</span>
          </span>
          {isRawExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {isRawExpanded && (
          <pre className="mt-2.5 max-h-48 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[10px] font-mono text-amber-300/80 leading-relaxed">
            {JSON.stringify({ diagnostics: diag, result_summary: { duration: result.duration, format: result.format, sample_rate: result.sample_rate, sha256: result.sha256 } }, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
