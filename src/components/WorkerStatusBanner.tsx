import React, { useState } from 'react';
import { Cpu, AlertCircle, CheckCircle2, ExternalLink, Copy, Check, Zap, Sparkles } from 'lucide-react';
import { WorkerInfo } from '../types';

interface WorkerStatusBannerProps {
  workerInfo: WorkerInfo | null;
  onOpenSettings?: () => void;
}

export const WorkerStatusBanner: React.FC<WorkerStatusBannerProps> = ({ workerInfo, onOpenSettings }) => {
  const [copied, setCopied] = useState(false);
  const isOnline = workerInfo && workerInfo.status !== 'offline';

  const colabWorkerUrl = '/notebooks/xtts_colab_worker.ipynb';

  const handleCopyNotebook = () => {
    navigator.clipboard.writeText(window.location.origin + colabWorkerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isOnline) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300 backdrop-blur-sm shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-white">GPU Worker Active: {workerInfo?.gpu_name}</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/40">
                  XTTS ONLINE
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  GEMINI CLOUD READY
                </span>
              </div>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                VRAM: {workerInfo?.vram_free_mb}MB free / {workerInfo?.vram_total_mb}MB • CUDA {workerInfo?.cuda_version} • XTTS-v2 & Gemini Flash active
              </p>
            </div>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline shrink-0"
            >
              Worker Details
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-zinc-300 backdrop-blur-sm shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-white">Gemini Flash Cloud TTS: Ready</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>INSTANT CLOUD READY</span>
              </span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-zinc-700">
                XTTS Worker: Standby
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Google Gemini Flash is active for instant zero-setup cloud generation. To run neural voice cloning with XTTS-v2, connect the free Google Colab GPU notebook.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
          <a
            href={colabWorkerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
          >
            <span>Open Colab Worker</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            onClick={handleCopyNotebook}
            className="flex items-center space-x-1 rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            title="Copy Notebook URL"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
