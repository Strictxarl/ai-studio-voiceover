import { GeminiVoicePreset, CinematicPreset } from '../types';

export const GEMINI_VOICES: GeminiVoicePreset[] = [
  {
    id: 'kore',
    name: 'Kore',
    gender: 'female',
    tone: 'Dark Documentary',
    useCase: 'Dark documentary / history',
    previewDescription: 'Atmospheric, gripping, measured cadence ideal for crime, history, and mysteries.'
  },
  {
    id: 'fenrir',
    name: 'Fenrir',
    gender: 'male',
    tone: 'Deep Cinematic Male',
    useCase: 'Deep cinematic male',
    previewDescription: 'Resonant, authoritative, deep bass tone for epic storytelling and discipline.'
  },
  {
    id: 'charon',
    name: 'Charon',
    gender: 'male',
    tone: 'Epic Movie Trailer',
    useCase: 'Epic trailer narration',
    previewDescription: 'Commanding, dramatic, blockbuster trailer intensity.'
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    gender: 'female',
    tone: 'Calm Storytelling',
    useCase: 'Calm storytelling',
    previewDescription: 'Intimate, warm, soothing cadence for podcasts, audiobooks, and lore.'
  },
  {
    id: 'puck',
    name: 'Puck',
    gender: 'male',
    tone: 'Energetic YouTube',
    useCase: 'Energetic YouTube narration',
    previewDescription: 'High-energy, crisp, engaging voice for YouTube Shorts, Reels, and fast pacing.'
  }
];

export const CINEMATIC_PRESETS: CinematicPreset[] = [
  {
    id: 'dark-history',
    name: 'Dark History',
    description: 'Slow, brooding, mysterious cadence',
    provider: 'gemini',
    voice: 'kore',
    speed: 0.92,
    temperature: 0.55,
    repetition_penalty: 1.7,
    pause_duration_ms: 850,
    speaking_style: 'Dark & Gripping'
  },
  {
    id: 'documentary',
    name: 'Documentary',
    description: 'Authoritative, balanced, cinema-grade narrative',
    provider: 'gemini',
    voice: 'kore',
    speed: 0.95,
    temperature: 0.65,
    repetition_penalty: 1.8,
    pause_duration_ms: 900,
    speaking_style: 'Authoritative'
  },
  {
    id: 'youtube-short',
    name: 'YouTube Short',
    description: 'Fast, punchy, high-retention cadence',
    provider: 'gemini',
    voice: 'puck',
    speed: 1.12,
    temperature: 0.85,
    repetition_penalty: 2.0,
    pause_duration_ms: 500,
    speaking_style: 'Energetic'
  },
  {
    id: 'motivational',
    name: 'Motivational',
    description: 'Deep, resonant, empowering delivery',
    provider: 'gemini',
    voice: 'fenrir',
    speed: 1.0,
    temperature: 0.75,
    repetition_penalty: 1.9,
    pause_duration_ms: 700,
    speaking_style: 'Inspiring'
  },
  {
    id: 'podcast-intro',
    name: 'Podcast Intro',
    description: 'Warm, conversational, intimate presence',
    provider: 'gemini',
    voice: 'zephyr',
    speed: 0.98,
    temperature: 0.70,
    repetition_penalty: 1.8,
    pause_duration_ms: 800,
    speaking_style: 'Intimate & Calm'
  }
];
