import React, { useState } from 'react';
import {
  Download,
  Share2,
  FileText,
  Copy,
  Check,
  Scissors,
  Video,
  Sparkles,
  ExternalLink,
  Package,
} from 'lucide-react';
import { TTSResult } from '../types';
import { WaveformPlayer } from './WaveformPlayer';
import { DiagnosticsCard } from './DiagnosticsCard';

interface AudioPlayerProps {
  result: TTSResult;
  onDownloadWav?: () => void;
  onDownloadMp3?: () => void;
  onRegenerateVoice?: () => void;
  onOpenSharePage?: (jobId: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  result,
  onDownloadWav,
  onDownloadMp3,
  onRegenerateVoice,
  onOpenSharePage,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);

  const handleCopyShareLink = () => {
    const fullUrl = `${window.location.origin}/share/${result.job_id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleDownloadZip = () => {
    window.open(`/api/export/${result.job_id}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Waveform Player */}
      <WaveformPlayer
        audioUrl={result.audio_url || result.wav_url || `/api/audio/${result.job_id}.wav`}
        duration={result.duration}
        title={result.text}
        subtitleSrtUrl={result.subtitle_srt_url || `/uploads/subtitles/${result.job_id}.srt`}
        subtitleVttUrl={result.subtitle_vtt_url || `/uploads/subtitles/${result.job_id}.vtt`}
        onShare={handleCopyShareLink}
        onDownloadZip={handleDownloadZip}
      />

      {/* Runtime Diagnostics & Acoustic Telemetry Card */}
      <DiagnosticsCard diagnostics={result.diagnostics} result={result} />

      {/* Production Output & Export Hub */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
            <Package className="h-4 w-4 text-amber-400" />
            <span>Production Export Hub</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyShareLink}
              className="flex items-center space-x-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:border-amber-500/50 transition"
              title="Copy Public Share Link"
            >
              {copiedShare ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Share Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Copy Share URL</span>
                </>
              )}
            </button>

            {onOpenSharePage && (
              <button
                onClick={() => onOpenSharePage(result.job_id)}
                className="flex items-center space-x-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
              >
                <span>View Share Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* WAV */}
          <a
            href={result.wav_url || result.audio_url}
            download={`voiceover_${result.job_id}.wav`}
            onClick={() => onDownloadWav?.()}
            className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition font-semibold text-zinc-200"
          >
            <div>
              <div className="text-white font-bold">WAV</div>
              <div className="text-[10px] text-zinc-500">Lossless 24kHz</div>
            </div>
            <Download className="h-3.5 w-3.5 text-amber-400" />
          </a>

          {/* MP3 */}
          <a
            href={result.mp3_url || result.audio_url}
            download={`voiceover_${result.job_id}.mp3`}
            onClick={() => onDownloadMp3?.()}
            className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition font-semibold text-zinc-200"
          >
            <div>
              <div className="text-white font-bold">MP3</div>
              <div className="text-[10px] text-zinc-500">192kbps Stream</div>
            </div>
            <Download className="h-3.5 w-3.5 text-orange-400" />
          </a>

          {/* SRT Subtitles */}
          <a
            href={result.subtitle_srt_url || `/uploads/subtitles/${result.job_id}.srt`}
            download={`subtitles_${result.job_id}.srt`}
            className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition font-semibold text-zinc-200"
          >
            <div>
              <div className="text-white font-bold">SRT</div>
              <div className="text-[10px] text-zinc-500">Whisper Subs</div>
            </div>
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
          </a>

          {/* Project ZIP */}
          <button
            type="button"
            onClick={handleDownloadZip}
            className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition font-bold text-amber-300 text-left"
          >
            <div>
              <div className="text-amber-400 font-bold">Project ZIP</div>
              <div className="text-[10px] text-amber-500/80">Audio + Subs + Text</div>
            </div>
            <Download className="h-3.5 w-3.5 text-amber-400" />
          </button>
        </div>

        {/* Video Editor Integrations */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="text-zinc-500 flex items-center space-x-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Open in Timeline Editor:</span>
          </span>

          <div className="flex items-center space-x-2">
            <a
              href="https://www.capcut.com/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition"
            >
              <Scissors className="h-3 w-3 text-amber-400" />
              <span>CapCut ↗</span>
            </a>

            <a
              href="https://app.clipchamp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition"
            >
              <Video className="h-3 w-3 text-amber-400" />
              <span>Clipchamp ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
