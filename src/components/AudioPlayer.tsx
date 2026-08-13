import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { TTSResult } from '../types';

interface AudioPlayerProps {
  result: TTSResult;
  onDownloadWav?: () => void;
  onDownloadMp3?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ result, onDownloadWav, onDownloadMp3 }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(result.duration || 0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [result.audio_url]);

  // Draw waveform visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barCount = 48;
    const barWidth = 3;
    const barGap = (width - barCount * barWidth) / (barCount - 1);
    const progressRatio = duration > 0 ? currentTime / duration : 0;

    // Pseudo-random deterministic waveform seeded by result SHA256
    const seed = result.sha256 || 'default_seed';

    for (let i = 0; i < barCount; i++) {
      const charCode = seed.charCodeAt(i % seed.length) || 50;
      const normalizedHeight = 0.2 + ((charCode * (i + 1) * 17) % 75) / 100;
      const barHeight = Math.max(6, normalizedHeight * (height - 8));
      const x = i * (barWidth + barGap);
      const y = (height - barHeight) / 2;

      const isPlayed = i / barCount <= progressRatio;

      ctx.fillStyle = isPlayed ? '#f59e0b' : '#3f3f46'; // Amber vs Zinc-700
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
  }, [currentTime, duration, result.sha256]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (timeSec: number) => {
    const mins = Math.floor(timeSec / 60);
    const secs = Math.floor(timeSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDownload = (format: 'wav' | 'mp3') => {
    const targetUrl = format === 'mp3' && result.mp3_url ? result.mp3_url : (result.wav_url || result.audio_url);
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = `voiceover_${result.job_id}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (format === 'wav' && onDownloadWav) onDownloadWav();
    if (format === 'mp3' && onDownloadMp3) onDownloadMp3();
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl backdrop-blur-sm">
      <audio ref={audioRef} src={result.audio_url} preload="auto" />

      <div className="flex flex-col space-y-4">
        {/* Header & Meta */}
        <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <span className="rounded bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-400 border border-amber-500/20">
              {result.model}
            </span>
            <span>•</span>
            <span>{result.sample_rate || 24000} Hz</span>
            <span>•</span>
            <span>{(result.file_size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>

          <div className="text-zinc-500 font-mono text-[10px] truncate max-w-[150px]">
            SHA: {result.sha256?.substring(0, 12)}...
          </div>
        </div>

        {/* Waveform Canvas */}
        <div className="relative flex items-center justify-center py-2">
          <canvas ref={canvasRef} width={500} height={44} className="w-full h-11 cursor-pointer" onClick={togglePlay} />
        </div>

        {/* Seek Bar & Timers */}
        <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlay}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-transform active:scale-95 shadow-lg shadow-amber-500/20 font-bold"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={toggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownload('wav')}
              className="flex items-center space-x-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 hover:border-amber-500/50 transition"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>WAV</span>
            </button>

            <button
              onClick={() => handleDownload('mp3')}
              className="flex items-center space-x-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>MP3</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
