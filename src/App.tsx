import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { WorkerStatusBanner } from './components/WorkerStatusBanner';
import { VoiceoverPage } from './components/VoiceoverPage';
import { VoiceClonerPage } from './components/VoiceClonerPage';
import { DocumentaryPage } from './components/DocumentaryPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsWorkerPage } from './components/SettingsWorkerPage';
import { VoiceProfile, TTSJob, TTSResult, WorkerInfo, ProviderStatusInfo } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'voiceover' | 'cloner' | 'documentary' | 'history' | 'settings'>('voiceover');
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [jobs, setJobs] = useState<TTSJob[]>([]);
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);
  const [providers, setProviders] = useState<ProviderStatusInfo[]>([]);

  // Fetch initial data & worker/provider status
  const fetchVoices = useCallback(async () => {
    try {
      const res = await fetch('/api/voices');
      if (res.ok) {
        const data = await res.json();
        setVoices(data);
      }
    } catch (e) {
      console.error('Failed fetching voices:', e);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/tts/history');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error('Failed fetching jobs:', e);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setWorkerInfo(data.gpu_worker || null);
      }
    } catch (e) {
      console.error('Failed fetching provider status:', e);
    }
  }, []);

  useEffect(() => {
    fetchVoices();
    fetchJobs();
    fetchProviders();

    // Poll worker status & history every 6 seconds
    const interval = setInterval(() => {
      fetchProviders();
      fetchJobs();
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchVoices, fetchJobs, fetchProviders]);

  // Helper function to poll job status until completed/failed
  const pollJobUntilComplete = async (job_id: string): Promise<TTSResult> => {
    const startTime = Date.now();
    const timeoutMs = 180000; // 3 minutes max

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 1500));
      const res = await fetch(`/api/tts/status/${job_id}`);
      if (!res.ok) continue;

      const data = await res.json();
      if (data.status === 'completed' && data.result) {
        fetchJobs();
        return data.result;
      }
      if (data.status === 'failed') {
        fetchJobs();
        throw new Error(data.error_message || 'Speech generation failed on GPU worker.');
      }
    }

    throw new Error('Speech generation timed out waiting for Colab GPU worker response.');
  };

  // Generation Handler
  const handleGenerate = async (params: {
    voice_id: string;
    text: string;
    language: string;
    provider: string;
    speed: number;
    speaking_style: string;
    temperature: number;
    repetition_penalty: number;
    output_format: 'wav' | 'mp3';
  }): Promise<TTSResult> => {
    const res = await fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed submitting generation job');
    }

    const { job_id } = await res.json();
    fetchJobs();
    return await pollJobUntilComplete(job_id);
  };

  // Documentary Mode Handler
  const handleGenerateDocumentary = async (params: {
    voice_id: string;
    script: string;
    language: string;
    pause_duration_ms: number;
  }): Promise<TTSResult> => {
    const res = await fetch('/api/tts/documentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed starting documentary job');
    }

    const { job_id } = await res.json();
    fetchJobs();
    return await pollJobUntilComplete(job_id);
  };

  // Voice Creation Handler
  const handleCreateVoice = async (formData: FormData): Promise<VoiceProfile> => {
    const res = await fetch('/api/voices', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed creating voice profile');
    }

    const data = await res.json();
    await fetchVoices();
    return data.voice;
  };

  // Voice Deletion
  const handleDeleteVoice = async (id: string) => {
    const res = await fetch(`/api/voices/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchVoices();
    }
  };

  // Pronunciation Dictionary Update
  const handleUpdatePronunciation = async (voiceId: string, dict: Record<string, string>) => {
    const res = await fetch(`/api/voices/${voiceId}/pronunciation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pronunciation_dict: dict })
    });
    if (res.ok) {
      fetchVoices();
    }
  };

  // Job History Deletion
  const handleDeleteJob = async (job_id: string) => {
    const res = await fetch(`/api/tts/history/${job_id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchJobs();
    }
  };

  // Regenerate Job (creates a BRAND NEW job ID!)
  const handleRegenerate = async (oldJob: TTSJob) => {
    setActiveTab('voiceover');
    await handleGenerate({
      voice_id: oldJob.voice_id,
      text: oldJob.text,
      language: oldJob.language,
      provider: oldJob.provider || 'xtts',
      speed: oldJob.speed || 1.0,
      speaking_style: oldJob.speaking_style || 'Neutral',
      temperature: oldJob.temperature ?? 0.75,
      repetition_penalty: oldJob.repetition_penalty ?? 2.0,
      output_format: oldJob.output_format || 'wav'
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
      
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} workerInfo={workerInfo} />

      {/* Main Body */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        
        {/* Banner highlighting GPU worker status */}
        <WorkerStatusBanner
          workerInfo={workerInfo}
          onOpenSettings={() => setActiveTab('settings')}
        />

        {/* Tab View Rendering */}
        {activeTab === 'voiceover' && (
          <VoiceoverPage
            voices={voices}
            workerInfo={workerInfo}
            onGenerate={handleGenerate}
            onUpdatePronunciation={handleUpdatePronunciation}
          />
        )}

        {activeTab === 'cloner' && (
          <VoiceClonerPage
            voices={voices}
            onCreateVoice={handleCreateVoice}
            onDeleteVoice={handleDeleteVoice}
          />
        )}

        {activeTab === 'documentary' && (
          <DocumentaryPage
            voices={voices}
            workerInfo={workerInfo}
            onGenerateDocumentary={handleGenerateDocumentary}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage
            jobs={jobs}
            onRegenerate={handleRegenerate}
            onDeleteJob={handleDeleteJob}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsWorkerPage
            workerInfo={workerInfo}
            providers={providers}
            onRefreshProviders={fetchProviders}
          />
        )}

      </main>

    </div>
  );
}
