import React from 'react';
import { Mic, Cpu, History, Settings, Sparkles, BookOpen, Wand2, Film, Package } from 'lucide-react';
import { WorkerInfo } from '../types';

export type ActiveTabType = 'voiceover' | 'my-voices' | 'scriptwriter' | 'documentary' | 'history' | 'settings';

interface NavbarProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  workerInfo: WorkerInfo | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, workerInfo }) => {
  const isWorkerOnline = workerInfo && workerInfo.status !== 'offline';

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/20">
            <Mic className="h-5 w-5 text-zinc-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-wider text-white font-display">
                CINEMATIC AI VOICE STUDIO
              </h1>
              <span className="hidden sm:inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Cloud-powered cinematic narration with Gemini Flash TTS and F5-TTS voice cloning.
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab('voiceover')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'voiceover'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>VOICEOVER</span>
          </button>

          <button
            onClick={() => setActiveTab('my-voices')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'my-voices'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>MY VOICES</span>
          </button>

          <button
            onClick={() => setActiveTab('scriptwriter')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'scriptwriter'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>SCRIPT WRITER</span>
          </button>

          <button
            onClick={() => setActiveTab('documentary')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'documentary'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>DOCUMENTARY</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>LIBRARY</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>ENGINES & GPU</span>
          </button>
        </nav>

        {/* Engine Ready Badge */}
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center space-x-2 rounded-xl border border-amber-500/30 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-amber-500/50 transition-all shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-300">
            {isWorkerOnline ? `GPU: ${workerInfo?.gpu_name.split(' ')[0]}` : 'Gemini & F5-TTS Ready'}
          </span>
        </button>

      </div>

      {/* Mobile Nav Bar */}
      <div className="flex lg:hidden border-t border-zinc-800/60 bg-zinc-950/95 px-2 py-1.5 justify-around text-[10px]">
        {[
          { id: 'voiceover', label: 'Voiceover', icon: Sparkles },
          { id: 'my-voices', label: 'My Voices', icon: Mic },
          { id: 'scriptwriter', label: 'Writer', icon: Wand2 },
          { id: 'documentary', label: 'Doc Mode', icon: Film },
          { id: 'history', label: 'Library', icon: Package },
          { id: 'settings', label: 'Engines', icon: Settings },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center py-1 px-2 rounded-md ${
                isActive ? 'text-amber-400 font-bold' : 'text-zinc-400'
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
