import React, { useState } from 'react';
import { Cpu, Settings, Copy, Check, ExternalLink, ShieldCheck, Server, Zap, RefreshCw } from 'lucide-react';
import { WorkerInfo, ProviderStatusInfo } from '../types';

interface SettingsWorkerPageProps {
  workerInfo: WorkerInfo | null;
  providers: ProviderStatusInfo[];
  onRefreshProviders: () => void;
}

export const SettingsWorkerPage: React.FC<SettingsWorkerPageProps> = ({
  workerInfo,
  providers,
  onRefreshProviders
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const workerApiKey = 'voice_studio_secret_worker_key_2026';
  const notebookPath = '/notebooks/xtts_colab_worker.ipynb';
  const fullNotebookUrl = window.location.origin + notebookPath;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(workerApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullNotebookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const isWorkerOnline = workerInfo && workerInfo.status !== 'offline';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display">System & GPU Worker Settings</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage cloud GPU workers, provider registry, and environment parameters.
          </p>
        </div>

        <button
          onClick={onRefreshProviders}
          className="flex items-center space-x-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Provider Status</span>
        </button>
      </div>

      {/* Provider Status Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Voice Model Providers</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-white">{p.name}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      p.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{p.model}</p>
                </div>

                <span className="rounded bg-zinc-800 px-2 py-1 text-[10px] font-mono text-amber-400 font-semibold border border-zinc-700">
                  {p.inference_type}
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">{p.description}</p>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400 font-mono">
                <span>Pricing: {p.pricing_status}</span>
                <span>Cloning: {p.supports_cloning ? 'Yes' : 'No'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Colab Worker Guide & Live Metrics */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl space-y-5">
        
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Colab GPU Worker Setup</h3>
              <p className="text-xs text-zinc-400">Run zero-cost XTTS-v2 inference on free Google Colab T4/A100 GPUs</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={notebookPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition"
            >
              <span>Download Notebook</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Live Metrics Grid if worker is online */}
        {isWorkerOnline && workerInfo ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">GPU Model</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{workerInfo.gpu_name}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Free VRAM</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{workerInfo.vram_free_mb} MB</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">CUDA Version</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{workerInfo.cuda_version}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-center">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">XTTS Loaded</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{workerInfo.xtts_loaded ? 'YES' : 'NO'}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-300">
            <strong>Worker Status: Offline / Listening.</strong> Follow the steps below to start the worker notebook in Google Colab.
          </div>
        )}

        {/* Credentials & Copy buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Worker API Key (WORKER_API_KEY)</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={workerApiKey}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-amber-400"
              />
              <button
                onClick={handleCopyKey}
                className="rounded-xl border border-zinc-800 bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700"
                title="Copy API Key"
              >
                {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Worker Notebook File Path</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={fullNotebookUrl}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
              />
              <button
                onClick={handleCopyUrl}
                className="rounded-xl border border-zinc-800 bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700"
                title="Copy Notebook Link"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

        </div>

        {/* Step-by-step instructions */}
        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Start Instructions:</h4>
          <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside">
            <li>Open <a href="https://colab.research.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">colab.research.google.com</a> in a new tab.</li>
            <li>Click <strong>File → Upload Notebook</strong> and upload <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 font-mono">/notebooks/xtts_colab_worker.ipynb</code>.</li>
            <li>Select <strong>Runtime → Change runtime type → T4 GPU</strong>.</li>
            <li>Run all cells (<code className="bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400 font-mono">Ctrl + F9</code>). The worker will connect and automatically poll for jobs!</li>
          </ol>
        </div>

      </div>

    </div>
  );
};
