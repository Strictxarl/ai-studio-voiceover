import React, { useState, useMemo } from 'react';
import {
  History,
  Play,
  Trash2,
  RotateCcw,
  Download,
  Clock,
  Share2,
  FileText,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  Layers,
  Check,
  ExternalLink,
  Volume2,
  Package,
} from 'lucide-react';
import { TTSJob, TTSResult } from '../types';
import { WaveformPlayer } from './WaveformPlayer';

interface HistoryPageProps {
  jobs: TTSJob[];
  onRegenerate: (job: TTSJob) => void;
  onDeleteJob: (job_id: string) => void;
  onOpenSharePage?: (jobId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  jobs,
  onRegenerate,
  onDeleteJob,
  onOpenSharePage,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  const completedJobs = useMemo(() => {
    return jobs.filter((j) => j.status === 'completed' && j.result);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return completedJobs.filter((job) => {
      // Provider filter
      if (providerFilter !== 'all') {
        if (providerFilter === 'gemini' && job.provider !== 'gemini') return false;
        if (providerFilter === 'xtts' && job.provider !== 'xtts') return false;
        if (providerFilter === 'doc' && !job.is_documentary) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = job.text.toLowerCase().includes(q);
        const voiceMatch = job.voice_name.toLowerCase().includes(q);
        const idMatch = job.job_id.toLowerCase().includes(q);
        const presetMatch = job.preset?.toLowerCase().includes(q);
        return textMatch || voiceMatch || idMatch || presetMatch;
      }

      return true;
    });
  }, [completedJobs, providerFilter, searchQuery]);

  const totalDurationSec = useMemo(() => {
    return completedJobs.reduce((acc, j) => acc + (j.result?.duration || 0), 0);
  }, [completedJobs]);

  const handleCopyShareLink = (jobId: string) => {
    const url = `${window.location.origin}/share/${jobId}`;
    navigator.clipboard.writeText(url);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2500);
  };

  const handleDownloadZip = (jobId: string) => {
    window.open(`/api/export/${jobId}`, '_blank');
  };

  const selectedJob = completedJobs.find((j) => j.job_id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Header & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display flex items-center space-x-2.5">
            <Package className="h-6 w-6 text-amber-400" />
            <span>Studio Library & History</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Persistent SQLite database of all synthesized narrations, Whisper subtitles, waveforms, and share links.
          </p>
        </div>

        {/* Quick Stats Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300">
            <span className="text-zinc-500">Tracks: </span>
            <span className="font-bold text-amber-400">{completedJobs.length}</span>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300">
            <span className="text-zinc-500">Total Audio: </span>
            <span className="font-bold text-amber-400 font-mono">
              {(totalDurationSec / 60).toFixed(1)} min
            </span>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5 text-xs text-emerald-400 font-semibold flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>SQLite Synced</span>
          </div>
        </div>
      </div>

      {/* Search and Provider Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by script text, voice, preset, or job ID..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Engines' },
            { id: 'gemini', label: 'Gemini Cloud' },
            { id: 'xtts', label: 'XTTS Clones' },
            { id: 'doc', label: 'Documentary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setProviderFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                providerFilter === tab.id
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Waveform Visualizer Preview */}
      {selectedJob && selectedJob.result && (
        <div className="rounded-2xl border border-amber-500/40 bg-zinc-900/95 p-5 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>
                Active Studio Player: {selectedJob.voice_name} ({selectedJob.provider.toUpperCase()})
              </span>
            </span>
            <button
              onClick={() => setSelectedJobId(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Minimize Player
            </button>
          </div>

          <p className="text-xs text-zinc-300 italic bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 leading-relaxed max-h-24 overflow-y-auto">
            "{selectedJob.text}"
          </p>

          <WaveformPlayer
            audioUrl={selectedJob.result.wav_url || selectedJob.result.audio_url}
            duration={selectedJob.result.duration}
            title={selectedJob.title || selectedJob.voice_name}
            subtitleSrtUrl={selectedJob.result.subtitle_srt_url}
            subtitleVttUrl={selectedJob.result.subtitle_vtt_url}
            onShare={() => handleCopyShareLink(selectedJob.job_id)}
            onDownloadZip={() => handleDownloadZip(selectedJob.job_id)}
          />
        </div>
      )}

      {/* History Grid / List */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center space-y-3">
          <History className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">
            {searchQuery || providerFilter !== 'all'
              ? 'No matching voiceover records found'
              : 'No Voiceover Generations in Library Yet'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery || providerFilter !== 'all'
              ? 'Try adjusting your search keywords or engine filters.'
              : 'Generated speech from Voiceover Studio or Documentary Mode is automatically saved to SQLite with instant subtitle and ZIP downloads.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredJobs.map((job) => {
            const result = job.result!;
            const isSelected = selectedJobId === job.job_id;
            const isCopied = copiedJobId === job.job_id;

            return (
              <div
                key={job.job_id}
                className={`rounded-2xl border bg-zinc-900/90 p-5 transition-all space-y-3.5 ${
                  isSelected
                    ? 'border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Provider Tag */}
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        job.provider === 'gemini'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : job.provider === 'xtts'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {job.provider === 'gemini' ? 'Gemini Flash' : job.provider.toUpperCase()}
                    </span>

                    {/* Preset Badge */}
                    {job.preset && (
                      <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                        {job.preset}
                      </span>
                    )}

                    {/* Voice Profile */}
                    <span className="font-bold text-white text-xs">{job.voice_name}</span>

                    <span className="text-zinc-600">•</span>

                    {/* Duration */}
                    <span className="font-mono text-xs text-amber-400 font-semibold">
                      {result.duration ? `${result.duration.toFixed(1)}s` : 'audio'}
                    </span>

                    <span className="text-zinc-600">•</span>

                    {/* Time */}
                    <span className="text-zinc-500 text-[11px]">
                      {new Date(job.created_at).toLocaleDateString()} at{' '}
                      {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Share & Open Page */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleCopyShareLink(job.job_id)}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:border-amber-500/50 transition"
                      title="Copy Public Share Link"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3.5 w-3.5 text-amber-400" />
                          <span>Share Link</span>
                        </>
                      )}
                    </button>

                    {onOpenSharePage && (
                      <button
                        onClick={() => onOpenSharePage(job.job_id)}
                        className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-400 hover:text-amber-400 transition"
                        title="View Public Page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Script Snippet */}
                <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed font-sans">
                  "{job.text}"
                </p>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Left: Playback & Preview */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedJobId(isSelected ? null : job.job_id)}
                      className="flex items-center space-x-1.5 rounded-xl bg-amber-500 text-zinc-950 px-3.5 py-1.5 text-xs font-extrabold hover:brightness-110 shadow-sm transition"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{isSelected ? 'Playing...' : 'Waveform Player'}</span>
                    </button>

                    {/* Download ZIP Package */}
                    <button
                      onClick={() => handleDownloadZip(job.job_id)}
                      className="flex items-center space-x-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
                      title="Download full project ZIP (Audio + SRT + VTT + Script)"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Project ZIP</span>
                    </button>
                  </div>

                  {/* Right: Individual File Direct Downloads & Utilities */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Lossless WAV */}
                    <a
                      href={result.wav_url || `/api/audio/${job.job_id}.wav`}
                      download={`${job.job_id}.wav`}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
                      title="Download Lossless WAV"
                    >
                      <Volume2 className="h-3 w-3 text-amber-400" />
                      <span>WAV</span>
                    </a>

                    {/* MP3 */}
                    <a
                      href={result.mp3_url || `/api/audio/${job.job_id}.mp3`}
                      download={`${job.job_id}.mp3`}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
                      title="Download MP3"
                    >
                      <Volume2 className="h-3 w-3 text-orange-400" />
                      <span>MP3</span>
                    </a>

                    {/* SRT */}
                    <a
                      href={result.subtitle_srt_url || `/uploads/subtitles/${job.job_id}.srt`}
                      download={`${job.job_id}.srt`}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
                      title="Download Whisper SRT Subtitles"
                    >
                      <FileText className="h-3 w-3 text-emerald-400" />
                      <span>SRT</span>
                    </a>

                    {/* Regenerate */}
                    <button
                      onClick={() => onRegenerate(job)}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-white transition"
                      title="Regenerate Script"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Retry</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteJob(job.job_id)}
                      className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition"
                      title="Delete from Library & SQLite"
                    >
                      <Trash2 className="h-3 w-3" />
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
