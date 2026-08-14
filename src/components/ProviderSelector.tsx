import React from 'react';
import { Zap, Cpu, Sparkles, Check, Flame, Radio } from 'lucide-react';
import { WorkerInfo } from '../types';

interface ProviderSelectorProps {
  selectedProvider: string;
  onSelectProvider: (provider: string) => void;
  workerInfo?: WorkerInfo | null;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onSelectProvider,
  workerInfo,
}) => {
  const isGpuOnline = workerInfo && workerInfo.status !== 'offline';

  const providers = [
    {
      id: 'gemini',
      name: 'Google Gemini Flash TTS',
      badge: 'RECOMMENDED',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold',
      status: 'Cloud Ready',
      statusType: 'ready',
      description: 'High-quality cinematic cloud narration with instant zero-GPU synthesis.',
      icon: Zap,
      iconColor: 'text-amber-400',
      accentBorder: 'hover:border-amber-500/60',
      activeClasses: 'border-amber-500 bg-amber-500/[0.08] shadow-amber-500/10 shadow-lg ring-1 ring-amber-500/50',
    },
    {
      id: 'f5-tts',
      name: 'F5-TTS Neural Cloner',
      badge: 'MY VOICES',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
      status: 'Ready',
      statusType: 'ready',
      description: 'Non-autoregressive flow matching for fast, precise custom voice cloning.',
      icon: Radio,
      iconColor: 'text-amber-400',
      accentBorder: 'hover:border-amber-500/60',
      activeClasses: 'border-amber-500 bg-amber-500/[0.08] shadow-amber-500/10 shadow-lg ring-1 ring-amber-500/50',
    },
    {
      id: 'xtts',
      name: 'Coqui XTTS-v2',
      badge: isGpuOnline ? 'GPU READY' : 'GPU WORKER',
      badgeColor: isGpuOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      status: isGpuOnline ? 'GPU Online' : 'GPU Worker Required',
      statusType: isGpuOnline ? 'ready' : 'standby',
      description: 'Zero-shot custom voice cloning with reference audio & emotion transfer.',
      icon: Cpu,
      iconColor: isGpuOnline ? 'text-emerald-400' : 'text-zinc-400',
      accentBorder: 'hover:border-zinc-600',
      activeClasses: 'border-amber-500 bg-amber-500/[0.08] shadow-amber-500/10 shadow-lg ring-1 ring-amber-500/50',
    },
    {
      id: 'openvoice',
      name: 'OpenVoice v2',
      badge: 'STANDBY',
      badgeColor: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      status: 'Experimental',
      statusType: 'standby',
      description: 'Lightweight open-source tone color converter and clone pipeline.',
      icon: Radio,
      iconColor: 'text-zinc-400',
      accentBorder: 'hover:border-zinc-700',
      activeClasses: 'border-amber-500 bg-amber-500/[0.08] shadow-amber-500/10 shadow-lg ring-1 ring-amber-500/50',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Synthesis Engine</span>
        </label>
        <span className="text-[11px] text-zinc-500 font-mono">
          Active: <span className="text-amber-400 font-bold uppercase">{selectedProvider}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {providers.map((p) => {
          const isSelected = selectedProvider === p.id;
          const Icon = p.icon;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectProvider(p.id)}
              className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 ${
                isSelected
                  ? p.activeClasses
                  : `border-zinc-800 bg-zinc-900/60 ${p.accentBorder} hover:bg-zinc-900/90`
              }`}
            >
              {/* Top Row: Icon, Title & Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`p-2 rounded-xl border border-zinc-800 bg-zinc-950/80 ${p.iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {p.badge && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    )}
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400 text-zinc-950'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>{p.name}</span>
                </h4>

                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  {p.description}
                </p>
              </div>

              {/* Bottom Status Indicator */}
              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                <span className="text-zinc-500 font-medium">Status</span>
                <span
                  className={`font-semibold flex items-center space-x-1 ${
                    p.statusType === 'ready' ? 'text-emerald-400' : 'text-zinc-400'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      p.statusType === 'ready' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                    }`}
                  />
                  <span>{p.status}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
