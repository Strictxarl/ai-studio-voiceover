import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, FileText, Share2, Sparkles } from 'lucide-react';

interface WaveformPlayerProps {
  audioUrl: string;
  duration?: number;
  title?: string;
  subtitleSrtUrl?: string;
  subtitleVttUrl?: string;
  onShare?: () => void;
  onDownloadZip?: () => void;
  accentColor?: string;
  showDetails?: boolean;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  duration,
  title,
  subtitleSrtUrl,
  subtitleVttUrl,
  onShare,
  onDownloadZip,
  accentColor = '#f59e0b',
  showDetails = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(duration || 0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');
  const [subtitles, setSubtitles] = useState<{ start: number; end: number; text: string }[]>([]);

  // Fetch and parse VTT / SRT for live subtitle preview in player
  useEffect(() => {
    if (subtitleVttUrl || subtitleSrtUrl) {
      const url = subtitleVttUrl || subtitleSrtUrl;
      fetch(url!)
        .then((res) => res.text())
        .then((text) => {
          const parsed: { start: number; end: number; text: string }[] = [];
          // Simple regex parse for timestamps: 00:00:01.234 --> 00:00:04.567 or with comma
          const regex = /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*\n([\s\S]*?)(?=\n\n|\n\d+\n|$)/g;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const start =
              parseInt(match[1]) * 3600 +
              parseInt(match[2]) * 60 +
              parseInt(match[3]) +
              parseInt(match[4]) / 1000;
            const end =
              parseInt(match[5]) * 3600 +
              parseInt(match[6]) * 60 +
              parseInt(match[7]) +
              parseInt(match[8]) / 1000;
            const subText = match[9].replace(/<[^>]*>/g, '').trim();
            if (subText) {
              parsed.push({ start, end, text: subText });
            }
          }
          setSubtitles(parsed);
        })
        .catch(() => {});
    }
  }, [subtitleVttUrl, subtitleSrtUrl]);

  // Update active subtitle based on currentTime
  useEffect(() => {
    if (subtitles.length > 0) {
      const current = subtitles.find((s) => currentTime >= s.start && currentTime <= s.end);
      setActiveSubtitle(current ? current.text : '');
    }
  }, [currentTime, subtitles]);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    setIsReady(false);
    setIsPlaying(false);

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#3f3f46', // zinc-700
      progressColor: accentColor, // amber-500
      cursorColor: '#fbbf24', // amber-400
      cursorWidth: 2,
      barWidth: 3,
      barGap: 3,
      barRadius: 3,
      height: 64,
      normalize: true,
      url: audioUrl,
    });

    ws.on('ready', () => {
      setIsReady(true);
      const dur = ws.getDuration();
      if (dur > 0) setTotalDuration(dur);
    });

    ws.on('timeupdate', (time) => {
      setCurrentTime(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, accentColor]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleRestart = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
    }
  };

  const toggleMute = () => {
    if (wavesurferRef.current) {
      const newMuted = !isMuted;
      wavesurferRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-2xl space-y-4">
      {/* Header Info */}
      {showDetails && title && (
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h4 className="text-sm font-bold text-zinc-100 line-clamp-1">{title}</h4>
          </div>
          <div className="flex items-center space-x-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="flex items-center space-x-1.5 rounded-lg border border-zinc-700/80 bg-zinc-800/60 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:border-amber-500/50 transition"
              >
                <Share2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Share</span>
              </button>
            )}
            {onDownloadZip && (
              <button
                type="button"
                onClick={onDownloadZip}
                className="flex items-center space-x-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Project ZIP</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Waveform Canvas */}
      <div className="relative rounded-xl bg-zinc-950/80 p-4 border border-zinc-800/60">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 backdrop-blur-[2px] rounded-xl z-10">
            <div className="flex items-center space-x-2 text-xs text-amber-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Decoding audio waveform...</span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full cursor-pointer" />
      </div>

      {/* Live Synchronized Subtitle Display */}
      {activeSubtitle && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-2.5 text-center">
          <p className="text-xs sm:text-sm font-semibold text-amber-300 tracking-wide transition-all duration-200 leading-snug">
            "{activeSubtitle}"
          </p>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Playback Controls */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!isReady}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            disabled={!isReady}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 transition disabled:opacity-50"
            title="Restart Audio"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Time Display */}
          <div className="font-mono text-xs text-zinc-400">
            <span className="font-bold text-amber-400">{formatTime(currentTime)}</span>
            <span className="mx-1 text-zinc-600">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Right: Subtitle & Audio Direct Links */}
        <div className="flex items-center space-x-2">
          {subtitleSrtUrl && (
            <a
              href={subtitleSrtUrl}
              download
              className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="Download Subtitles (.srt)"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>SRT</span>
            </a>
          )}
          {subtitleVttUrl && (
            <a
              href={subtitleVttUrl}
              download
              className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="Download WebVTT (.vtt)"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>VTT</span>
            </a>
          )}
          <a
            href={audioUrl}
            download
            className="flex items-center space-x-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
            title="Download Audio Track"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Audio</span>
          </a>
        </div>
      </div>
    </div>
  );
};
