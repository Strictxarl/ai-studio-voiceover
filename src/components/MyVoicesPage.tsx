import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Upload, 
  Play, 
  Pause, 
  Trash2, 
  Sparkles, 
  Volume2, 
  Plus, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Radio, 
  Zap,
  Info,
  Search,
  FileAudio
} from 'lucide-react';
import { VoiceProfile } from '../types';

interface MyVoicesPageProps {
  voices: VoiceProfile[];
  onVoiceCreated: (newVoice: VoiceProfile) => void;
  onVoiceDeleted: (id: string) => void;
  onSelectForStudio: (voiceId: string) => void;
}

export const MyVoicesPage: React.FC<MyVoicesPageProps> = ({
  voices,
  onVoiceCreated,
  onVoiceDeleted,
  onSelectForStudio
}) => {
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Audio playback preview for saved list
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const listAudioRef = useRef<HTMLAudioElement | null>(null);

  // Form preview player
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const formAudioRef = useRef<HTMLAudioElement | null>(null);

  const customVoices = voices.filter(
    v => v.engine === 'f5-tts' || v.metadata?.isCloned || v.metadata?.isCustom || !v.metadata?.isGeminiVoice
  );

  const filteredVoices = customVoices.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processAudioFile(file);
    }
  };

  const processAudioFile = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      setAudioDuration(tempAudio.duration);
    };
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const recordedFile = new File([audioBlob], `recorded_voice_${Date.now()}.wav`, { type: 'audio/wav' });
        processAudioFile(recordedFile);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or unsupported by browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSaveVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceName.trim()) {
      setError('Please enter a name for your custom cloned voice.');
      return;
    }
    if (!selectedFile) {
      setError('Please upload a reference audio sample or record your voice.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('name', voiceName.trim());
      formData.append('description', description.trim() || `Cloned reference voice for ${voiceName.trim()}`);
      formData.append('language', language);
      formData.append('engine', 'f5-tts');
      formData.append('reference_audio', selectedFile);

      const res = await fetch('/api/voices/custom', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save custom cloned voice.');
      }

      const data = await res.json();
      const newVoice = data.voice || data;
      
      onVoiceCreated(newVoice);
      setSuccessMsg(`Voice "🎤 ${voiceName.trim()}" successfully cloned and saved to My Voices!`);
      
      // Reset form
      setVoiceName('');
      setDescription('');
      setSelectedFile(null);
      setAudioUrl(null);
      setAudioDuration(0);
      
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed saving custom voice profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVoice = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/voices/custom/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        // Try fallback to /api/voices/:id
        await fetch(`/api/voices/${id}`, { method: 'DELETE' });
      }

      onVoiceDeleted(id);
      if (playingVoiceId === id && listAudioRef.current) {
        listAudioRef.current.pause();
        setPlayingVoiceId(null);
      }
    } catch (err: any) {
      alert(`Could not delete voice: ${err.message}`);
    }
  };

  const togglePlayListAudio = (voice: VoiceProfile) => {
    if (playingVoiceId === voice.id) {
      listAudioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (listAudioRef.current) {
        listAudioRef.current.src = voice.reference_audio_url;
        listAudioRef.current.play().catch(e => console.warn('Playback error:', e));
        setPlayingVoiceId(voice.id);
      }
    }
  };

  const toggleFormAudioPreview = () => {
    if (!formAudioRef.current || !audioUrl) return;
    if (isPreviewPlaying) {
      formAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      formAudioRef.current.play().catch(e => console.warn('Preview error:', e));
      setIsPreviewPlaying(true);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hidden audio elements for reference playback */}
      <audio
        ref={listAudioRef}
        onEnded={() => setPlayingVoiceId(null)}
        onError={() => setPlayingVoiceId(null)}
      />
      {audioUrl && (
        <audio
          ref={formAudioRef}
          src={audioUrl}
          onEnded={() => setIsPreviewPlaying(false)}
          onError={() => setIsPreviewPlaying(false)}
        />
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-display flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-zinc-950 font-black shadow-md shadow-amber-500/20">
              <Mic className="h-4 w-4" />
            </div>
            <span>My Voices</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Create, store, and manage persistent custom cloned voices powered by <strong className="text-amber-400">F5-TTS Neural Voice Flow Matching</strong>.
          </p>
        </div>

        {/* Engine Status Badges */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
            <Zap className="h-3 w-3" />
            <span>F5-TTS Flow Matching</span>
          </div>
          <div className="flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            <span>{customVoices.length} Saved Voices</span>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="flex items-center space-x-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-300 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Upload Form (Left) & Saved Voices Gallery (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form: Clone New Voice */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Plus className="h-4 w-4 text-amber-400" />
                <span>Clone New Voice</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">ENGINE: F5-TTS</span>
            </div>

            <form onSubmit={handleSaveVoice} className="space-y-4">
              
              {/* Voice Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Voice Name <span className="text-amber-400">*</span></span>
                  <span className="text-[10px] text-zinc-500 font-normal">e.g. Yusuf Narrator</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 font-bold">
                    🎤
                  </div>
                  <input
                    type="text"
                    required
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    placeholder="Yusuf Narrator"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Reference Audio Upload / Record */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">
                  Reference Voice Audio <span className="text-amber-400">*</span>
                </label>

                {/* Upload Zone */}
                <div className="relative rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-center hover:border-amber-500/50 transition">
                  <input
                    type="file"
                    accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold text-zinc-200">
                      {selectedFile ? selectedFile.name : 'Click to browse or drop audio file'}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Supports clean .WAV, .MP3, .M4A recordings (5–15 seconds recommended)
                    </p>
                  </div>
                </div>

                {/* Live Microphone Recording Option */}
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="flex items-center space-x-2 text-xs">
                    <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
                    <span className="text-zinc-300 font-medium">
                      {isRecording ? `Recording... (${recordingTime}s)` : 'Or record voice directly'}
                    </span>
                  </div>

                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
                    >
                      Start Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 animate-pulse transition"
                    >
                      Stop & Use Clip
                    </button>
                  )}
                </div>

                {/* Reference Audio Player Preview */}
                {audioUrl && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
                    <div className="flex items-center space-x-2 text-xs text-amber-300 font-medium">
                      <button
                        type="button"
                        onClick={toggleFormAudioPreview}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-bold hover:scale-105 transition"
                      >
                        {isPreviewPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                      </button>
                      <span className="truncate max-w-[180px]">{selectedFile?.name || 'Voice sample ready'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      {audioDuration ? `${Math.round(audioDuration)}s` : 'Ready'}
                    </span>
                  </div>
                )}
              </div>

              {/* Description & Language */}
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">
                    Voice Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Deep documentary baritone, crisp cadence"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Error banner inside form */}
              {error && (
                <div className="flex items-center space-x-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Save Voice Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedFile || !voiceName.trim()}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-3.5 px-4 text-xs font-extrabold text-zinc-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Cloning & Saving Voice...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>SAVE TO MY VOICES (F5-TTS)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Tips Card */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2.5 text-xs text-zinc-400">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Info className="h-4 w-4" />
              <span>Voice Cloning Pro-Tips</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400 leading-relaxed">
              <li>Use <strong>6 to 15 seconds</strong> of uninterrupted clean speech without background noise.</li>
              <li>Natural speaking cadence produces the most authentic F5-TTS flow matching.</li>
              <li>Once saved, the cloned voice immediately appears in the <strong>Voiceover Studio</strong> selector.</li>
            </ul>
          </div>
        </div>

        {/* Right Gallery: Saved Cloned Voices */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>My Cloned Voices</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-amber-400 font-mono">
                  {filteredVoices.length}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Persistent voices saved in your audio library. Ready for 1-click studio narration.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voices..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {filteredVoices.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400">
                <Mic className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-white">No custom voices found</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Upload a 6-second voice sample on the left to clone your first voice using F5-TTS.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVoices.map((voice) => {
                const isPlaying = playingVoiceId === voice.id;
                const formattedDate = new Date(voice.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <div
                    key={voice.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl hover:border-amber-500/50 hover:bg-zinc-900 transition-all duration-200"
                  >
                    {/* Top Row: Icon, Title & Actions */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                            <span className="text-lg">🎤</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-white flex items-center space-x-1.5">
                              <span>{voice.name.startsWith('🎤') ? voice.name : `🎤 ${voice.name}`}</span>
                            </h4>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                {voice.engine ? voice.engine.toUpperCase() : 'F5-TTS'}
                              </span>
                              <span className="text-[10px] text-zinc-500 flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formattedDate}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delete Action */}
                        <button
                          type="button"
                          onClick={() => handleDeleteVoice(voice.id, voice.name)}
                          title="Delete voice"
                          className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800/80 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {voice.description || 'Custom cloned reference voice.'}
                      </p>
                    </div>

                    {/* Bottom Controls */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      {/* Audio Playback Trigger */}
                      <button
                        type="button"
                        onClick={() => togglePlayListAudio(voice)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                          isPlaying
                            ? 'border-amber-500 bg-amber-500 text-zinc-950 font-bold'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        <span>{isPlaying ? 'Playing' : 'Preview'}</span>
                      </button>

                      {/* Studio Action Button */}
                      <button
                        type="button"
                        onClick={() => onSelectForStudio(voice.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500 hover:text-zinc-950 transition"
                      >
                        <span>Use in Studio</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
