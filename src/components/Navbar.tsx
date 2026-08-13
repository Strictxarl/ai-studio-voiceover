import React from 'react';
import { Mic, Cpu, History, Settings, Sparkles, BookOpen } from 'lucide-react';
import { WorkerInfo } from '../types';

interface NavbarProps {
  activeTab: 'voiceover' | 'cloner' | 'documentary' | 'history' | 'settings';
  setActiveTab: (tab: 'voiceover' | 'cloner' | 'documentary' | 'history' | 'settings') => void;
  workerInfo: WorkerInfo | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, workerInfo }) => {
  const isWorkerOnline = workerInfo && workerInfo.status !== 'offline';

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-display">VOICE STUDIO</h1>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                XTTS-v2
              </span>
            </div>
            <p className="text-xs text-zinc-400">Personal AI Voiceover & Cloning Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab('voiceover')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'voiceover'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>VOICEOVER</span>
          </button>

          <button
            onClick={() => setActiveTab('cloner')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'cloner'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>VOICE CLONER</span>
          </button>

          <button
            onClick={() => setActiveTab('documentary')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'documentary'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>DOCUMENTARY</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <History className="h-4 w-4" />
            <span>HISTORY</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>SETTINGS</span>
          </button>
        </nav>

        {/* Worker Status Badge */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
            isWorkerOnline
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>
            {isWorkerOnline ? `GPU: ${workerInfo?.gpu_name.split(' ')[0]}` : 'Worker Offline'}
          </span>
          <span className={`h-2 w-2 rounded-full ${isWorkerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </button>

      </div>

      {/* Mobile Nav */}
      <div className="flex md:hidden border-t border-zinc-800/60 bg-zinc-950/95 px-2 py-1.5 justify-around text-xs">
        {[
          { id: 'voiceover', label: 'Voiceover', icon: Sparkles },
          { id: 'cloner', label: 'Cloner', icon: Mic },
          { id: 'documentary', label: 'Doc Mode', icon: BookOpen },
          { id: 'history', label: 'History', icon: History },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center py-1 px-2 rounded-md ${
                isActive ? 'text-amber-400 font-semibold' : 'text-zinc-400'
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
