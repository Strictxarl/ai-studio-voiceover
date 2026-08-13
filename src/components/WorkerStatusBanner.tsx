import React, { useState } from 'react';
import { Cpu, AlertCircle, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';
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
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-white">GPU Worker Active: {workerInfo?.gpu_name}</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/40">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-emerald-400/80">
                VRAM: {workerInfo?.vram_free_mb}MB free / {workerInfo?.vram_total_mb}MB • CUDA {workerInfo?.cuda_version} • XTTS-v2 loaded
              </p>
            </div>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              Worker Details
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-amber-200 backdrop-blur-sm shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/30">
            <AlertCircle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white flex items-center space-x-2">
              <span>Free GPU Worker Offline</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/40">
                STANDBY
              </span>
            </h4>
            <p className="text-xs text-zinc-300 mt-0.5">
              To run voice cloning without laptop GPU, connect the Google Colab GPU notebook worker.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href={colabWorkerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition"
          >
            <span>Open Colab Worker</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            onClick={handleCopyNotebook}
            className="flex items-center space-x-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            title="Copy Notebook URL"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
