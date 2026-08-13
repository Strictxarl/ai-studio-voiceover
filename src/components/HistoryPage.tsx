import React, { useState } from 'react';
import { History, Play, Trash2, RotateCcw, Download, Clock, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { TTSJob, TTSResult } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface HistoryPageProps {
  jobs: TTSJob[];
  onRegenerate: (job: TTSJob) => void;
  onDeleteJob: (job_id: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  jobs,
  onRegenerate,
  onDeleteJob
}) => {
  const [selectedResult, setSelectedResult] = useState<TTSResult | null>(null);

  const completedJobs = jobs.filter(j => j.status === 'completed' && j.result);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display">Generation History</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review, preview, download, or regenerate previous AI voiceover outputs.
          </p>
        </div>
        <div className="text-xs text-zinc-400 font-mono">
          Total Generated: <span className="text-amber-400 font-bold">{completedJobs.length}</span>
        </div>
      </div>

      {/* Selected Result Player Modal / Active Preview Box */}
      {selectedResult && (
        <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/90 p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Active Preview: Job #{selectedResult.job_id}</span>
            </span>
            <button
              onClick={() => setSelectedResult(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Close Preview
            </button>
          </div>

          <p className="text-xs text-zinc-300 italic bg-zinc-950 p-3 rounded-xl border border-zinc-800">
            "{selectedResult.text}"
          </p>

          <AudioPlayer result={selectedResult} />
        </div>
      )}

      {/* History List */}
      {completedJobs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-3">
          <History className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">No Generation History Yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Your generated voiceovers and cloned speech outputs will appear here with instant download & playback actions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedJobs.map((job) => {
            const result = job.result!;
            const isPreviewing = selectedResult?.job_id === job.job_id;

            return (
              <div
                key={job.job_id}
                className={`rounded-2xl border bg-zinc-900/90 p-4 transition-all space-y-3 ${
                  isPreviewing ? 'border-amber-500/60 shadow-lg shadow-amber-500/10' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{job.voice_name}</span>
                    <span>•</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-amber-400">
                      {job.language.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-zinc-400">{result.duration?.toFixed(1)}s</span>
                    <span>•</span>
                    <span className="text-zinc-500 text-[11px]">{new Date(job.created_at).toLocaleString()}</span>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[140px]">
                    ID: {job.job_id}
                  </div>
                </div>

                {/* Script Preview */}
                <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                  "{job.text}"
                </p>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setSelectedResult(result)}
                    className="flex items-center space-x-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Play Audio</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {/* Regenerate Button */}
                    <button
                      onClick={() => onRegenerate(job)}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                      title="Regenerate (Creates NEW Job ID)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Regenerate</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteJob(job.job_id)}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-red-950 hover:text-red-400 transition"
                      title="Delete from History"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
