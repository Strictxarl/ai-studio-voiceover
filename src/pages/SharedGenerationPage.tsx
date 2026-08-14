import React, { useEffect, useState } from 'react';
import {
  Mic,
  Share2,
  Download,
  FileText,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Clock,
  User,
  Layers,
  Radio,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import { GenerationRecord } from '../types';
import { WaveformPlayer } from '../components/WaveformPlayer';

interface SharedGenerationPageProps {
  generationId?: string;
  onBackToStudio?: () => void;
}

export const SharedGenerationPage: React.FC<SharedGenerationPageProps> = ({
  generationId: propGenId,
  onBackToStudio,
}) => {
  // Extract id from path if URL is /share/:id
  const getPathId = () => {
    if (propGenId) return propGenId;
    const match = window.location.pathname.match(/\/share\/([^/?#]+)/);
    return match ? match[1] : '';
  };

  const [id, setId] = useState<string>(getPathId());
  const [data, setData] = useState<GenerationRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [activeFormat, setActiveFormat] = useState<'wav' | 'mp3'>('wav');

  useEffect(() => {
    const targetId = getPathId();
    if (!targetId) {
      setError('No shared generation ID provided in URL');
      setLoading(false);
      return;
    }
    setId(targetId);

    fetch(`/api/share/${targetId}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Shared project not found or expired.');
        }
        return res.json();
      })
      .then((rec: GenerationRecord) => {
        setData(rec);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load audio project');
        setLoading(false);
      });
  }, [propGenId]);

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyScript = () => {
    if (data?.script) {
      navigator.clipboard.writeText(data.script);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    }
  };

  const handleDownloadZip = () => {
    if (!data) return;
    const exportId = data.id || data.jobId;
    window.open(`/api/export/${exportId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="relative flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
            <Mic className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">Loading cinematic voice project...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-zinc-900/90 p-8 text-center space-y-4 shadow-2xl">
          <div className="h-12 w-12 mx-auto rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <Radio className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white font-display">Audio Project Not Found</h2>
          <p className="text-xs text-zinc-400">{error || 'This generation may have been removed or does not exist.'}</p>
          <div className="pt-2">
            <button
              onClick={() => {
                if (onBackToStudio) {
                  onBackToStudio();
                } else {
                  window.location.href = '/';
                }
              }}
              className="inline-flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:brightness-110 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go to AI Voice Studio</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const audioSourceUrl =
    activeFormat === 'mp3' && data.audioMp3Url
      ? data.audioMp3Url
      : data.audioWavUrl || `/api/audio/${data.jobId}.wav`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950 pb-16">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 shadow-md shadow-amber-500/20">
              <Mic className="h-4 w-4 text-zinc-950 font-bold" />
            </div>
            <div>
              <span className="text-xs font-extrabold tracking-wider text-white font-display">
                CINEMATIC AI VOICE STUDIO
              </span>
              <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/30">
                PUBLIC SHARE
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onBackToStudio) {
                  onBackToStudio();
                } else {
                  window.location.href = '/';
                }
              }}
              className="flex items-center space-x-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:border-amber-500/40 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Open Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        {/* Project Hero Card */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="capitalize">{data.preset || 'Documentary'} Preset</span>
              </span>

              <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-amber-400" />
                <span>Voice: {data.voiceId.toUpperCase()}</span>
              </span>

              <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-400 flex items-center space-x-1.5">
                <Layers className="h-3.5 w-3.5 text-orange-400" />
                <span>
                  {data.provider === 'gemini'
                    ? 'Google Gemini Flash TTS'
                    : data.provider === 'xtts'
                    ? 'Coqui XTTS-v2'
                    : data.provider}
                </span>
              </span>

              {data.durationSeconds ? (
                <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-mono font-bold text-zinc-300 flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{data.durationSeconds.toFixed(1)}s audio</span>
                </span>
              ) : null}
            </div>

            {/* Share & Export Quick Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyShareLink}
                className="flex items-center space-x-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:text-white hover:border-amber-500/50 shadow-sm transition"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Share Page</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadZip}
                className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-extrabold text-zinc-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Project ZIP</span>
              </button>
            </div>
          </div>

          {/* Project Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
              {data.title || 'Cinematic Narration Voiceover'}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Created on {new Date(data.createdAt).toLocaleDateString()} at{' '}
              {new Date(data.createdAt).toLocaleTimeString()}
            </p>
          </div>

          {/* Audio Format Switcher */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-zinc-400 font-semibold">Format:</span>
            <button
              onClick={() => setActiveFormat('wav')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                activeFormat === 'wav'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
              }`}
            >
              Lossless WAV
            </button>
            {data.audioMp3Url && (
              <button
                onClick={() => setActiveFormat('mp3')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                  activeFormat === 'mp3'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                }`}
              >
                Compressed MP3
              </button>
            )}
          </div>

          {/* Waveform Visualization Player */}
          <WaveformPlayer
            audioUrl={audioSourceUrl}
            duration={data.durationSeconds || undefined}
            title={data.title || 'Voice Narration'}
            subtitleSrtUrl={data.subtitleSrtUrl || undefined}
            subtitleVttUrl={data.subtitleVttUrl || undefined}
            onShare={handleCopyShareLink}
            onDownloadZip={handleDownloadZip}
            showDetails={false}
          />
        </div>

        {/* Script & Subtitles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Full Narration Script View */}
          <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Narration Script</h3>
              </div>
              <button
                onClick={handleCopyScript}
                className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-amber-400 transition"
              >
                {copiedScript ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 text-sm text-zinc-200 leading-relaxed font-sans">
              {data.script.split(/\n+/).map((para, i) => (
                <p key={i} className="text-zinc-300 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Export Bundle Contents & Downloads */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-4">
              <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
                <Download className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Files</h3>
              </div>

              <div className="space-y-2 text-xs">
                {/* WAV */}
                <a
                  href={data.audioWavUrl || `/api/audio/${data.jobId}.wav`}
                  download={`${data.jobId}.wav`}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition text-zinc-200"
                >
                  <div className="flex items-center space-x-2.5">
                    <Volume2 className="h-4 w-4 text-amber-400" />
                    <div>
                      <div className="font-bold text-white">Master Audio (WAV)</div>
                      <div className="text-[10px] text-zinc-500">24kHz 16-bit Lossless PCM</div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-zinc-400" />
                </a>

                {/* MP3 */}
                {data.audioMp3Url && (
                  <a
                    href={data.audioMp3Url}
                    download={`${data.jobId}.mp3`}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition text-zinc-200"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Volume2 className="h-4 w-4 text-orange-400" />
                      <div>
                        <div className="font-bold text-white">Audio Stream (MP3)</div>
                        <div className="text-[10px] text-zinc-500">192kbps High Bitrate</div>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-zinc-400" />
                  </a>
                )}

                {/* Subtitles SRT */}
                {data.subtitleSrtUrl && (
                  <a
                    href={data.subtitleSrtUrl}
                    download={`${data.jobId}.srt`}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition text-zinc-200"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <div>
                        <div className="font-bold text-white">Subtitles (.SRT)</div>
                        <div className="text-[10px] text-zinc-500">Premiere, DaVinci, YouTube</div>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-zinc-400" />
                  </a>
                )}

                {/* Subtitles VTT */}
                {data.subtitleVttUrl && (
                  <a
                    href={data.subtitleVttUrl}
                    download={`${data.jobId}.vtt`}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition text-zinc-200"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="h-4 w-4 text-teal-400" />
                      <div>
                        <div className="font-bold text-white">Captions (.VTT)</div>
                        <div className="text-[10px] text-zinc-500">HTML5 Web Video Players</div>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-zinc-400" />
                  </a>
                )}
              </div>

              {/* Download Bundle Button */}
              <button
                onClick={handleDownloadZip}
                className="w-full mt-2 flex items-center justify-center space-x-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 p-3 text-xs font-bold text-zinc-100 transition border border-zinc-700"
              >
                <Download className="h-4 w-4 text-amber-400" />
                <span>Download All Files (.ZIP)</span>
              </button>
            </div>

            {/* Quick Promo CTA */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>Create Your Own Narration</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generate studio-quality voiceovers with Google Gemini Flash TTS, AI script writing, and automatic subtitle generation.
              </p>
              <button
                onClick={() => {
                  if (onBackToStudio) {
                    onBackToStudio();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-zinc-950 hover:brightness-110 transition"
              >
                <span>Launch Voice Studio</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
