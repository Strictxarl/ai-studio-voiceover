import React, { useState, useRef } from 'react';
import { Upload, Mic, Play, Pause, Trash2, CheckCircle2, AlertCircle, Sparkles, Volume2, Plus, ShieldAlert } from 'lucide-react';
import { VoiceProfile } from '../types';

interface VoiceClonerPageProps {
  voices: VoiceProfile[];
  onCreateVoice: (formData: FormData) => Promise<VoiceProfile>;
  onDeleteVoice: (id: string) => Promise<void>;
}

export const VoiceClonerPage: React.FC<VoiceClonerPageProps> = ({
  voices,
  onCreateVoice,
  onDeleteVoice
}) => {
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      setError('Voice profile name is required.');
      return;
    }
    if (!selectedFile) {
      setError('Please upload an audio sample or record your voice.');
      return;
    }

    if (audioDuration < 3) {
      setError('Reference recording should be at least 3 to 6 seconds long for accurate cloning.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append('name', voiceName.trim());
      formData.append('description', description.trim());
      formData.append('language', language);
      formData.append('reference_audio', selectedFile);

      await onCreateVoice(formData);

      setSuccessMsg(`Voice profile "${voiceName}" created successfully!`);
      setVoiceName('');
      setDescription('');
      setSelectedFile(null);
      setAudioUrl(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed saving voice profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePlayPreset = (voice: VoiceProfile) => {
    if (playingVoiceId === voice.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const newAudio = new Audio(voice.reference_audio_url);
      audioRef.current = newAudio;
      newAudio.play();
      newAudio.onended = () => setPlayingVoiceId(null);
      setPlayingVoiceId(voice.id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-display">Voice Cloner & Profile Manager</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Upload a 6-30 second audio recording to train a custom voice profile for <strong className="text-amber-400">XTTS-v2</strong>.
        </p>
      </div>

      {/* Permission & Security Disclaimer */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-300 flex items-center space-x-2">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
        <span>
          <strong>Ethical AI Guardrail:</strong> Voice cloning must only be performed on voice samples you own or have permission to clone. Audio references are stored securely and never shared.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload / Record Form */}
        <div className="lg:col-span-7 space-y-5">
          
          <form onSubmit={handleSaveVoice} className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create New Voice Profile</h3>
            </div>

            {/* Voice Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Voice Profile Name *</label>
              <input
                type="text"
                placeholder="e.g., My Documentary Voice, Deep Narration"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Description / Tone Notes</label>
              <input
                type="text"
                placeholder="e.g., Deep resonance, clear articulation, warm storytelling tone"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Audio Source: File Upload vs Microphone */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300">Audio Reference Sample (6s - 30s recommended)</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* File Upload Box */}
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/60 p-4 cursor-pointer hover:border-amber-500/50 hover:bg-zinc-850 transition text-center">
                  <Upload className="h-6 w-6 text-amber-400 mb-2" />
                  <span className="text-xs font-semibold text-zinc-200">Upload Audio File</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">WAV, MP3, M4A, OGG</span>
                  <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                </label>

                {/* Microphone Record Box */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-center">
                  <Mic className={`h-6 w-6 mb-2 ${isRecording ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} />
                  <span className="text-xs font-semibold text-zinc-200">
                    {isRecording ? `Recording... (${recordingTime}s)` : 'Record via Microphone'}
                  </span>
                  
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="mt-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
                    >
                      Stop Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="mt-2 rounded-lg bg-zinc-800 px-3 py-1 text-xs font-semibold text-amber-400 hover:bg-zinc-700"
                    >
                      Start Recording
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Audio Sample Preview */}
            {audioUrl && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="font-semibold truncate max-w-[200px]">{selectedFile?.name}</span>
                  <span className="font-mono text-amber-400">{audioDuration.toFixed(1)}s</span>
                </div>
                <audio src={audioUrl} controls className="w-full h-8" />
              </div>
            )}

            {/* Success / Error Messages */}
            {successMsg && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="w-full rounded-xl bg-amber-500 py-3 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Processing Voice Sample...' : 'SAVE VOICE PROFILE'}
            </button>

          </form>

        </div>

        {/* Right Column: Existing Saved Voices List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3">
              Saved Voice Profiles ({voices.length})
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 flex items-center justify-between hover:border-zinc-700 transition"
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-white truncate">{voice.name}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 uppercase font-mono">
                        {voice.language}
                      </span>
                      {voice.metadata?.isPreset && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400 font-bold border border-amber-500/20">
                          PRESET
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{voice.description || 'Custom reference sample'}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => togglePlayPreset(voice)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-amber-400 hover:bg-amber-500 hover:text-zinc-950 transition"
                      title="Play Reference Sample"
                    >
                      {playingVoiceId === voice.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </button>

                    {!voice.metadata?.isPreset && (
                      <button
                        onClick={() => onDeleteVoice(voice.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 hover:bg-red-950 hover:text-red-400 transition"
                        title="Delete Profile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
