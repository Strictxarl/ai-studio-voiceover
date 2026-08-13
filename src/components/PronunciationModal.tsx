import React, { useState } from 'react';
import { X, Plus, Trash2, Check, BookOpen } from 'lucide-react';
import { VoiceProfile } from '../types';

interface PronunciationModalProps {
  voice: VoiceProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (voiceId: string, dict: Record<string, string>) => void;
}

export const PronunciationModal: React.FC<PronunciationModalProps> = ({
  voice,
  isOpen,
  onClose,
  onSave,
}) => {
  const [pairs, setPairs] = useState<{ term: string; replacement: string }[]>(() => {
    const dict = voice.pronunciation_dict || {};
    const initial = Object.entries(dict).map(([term, replacement]) => ({ term, replacement }));
    return initial.length > 0 ? initial : [
      { term: 'Yorùbá', replacement: 'Yoruba' },
      { term: 'Babylon', replacement: 'Bab-i-lon' },
      { term: 'Mesopotamia', replacement: 'Meso-po-tamia' }
    ];
  });

  if (!isOpen) return null;

  const handleAddRow = () => {
    setPairs([...pairs, { term: '', replacement: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    setPairs(pairs.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: 'term' | 'replacement', value: string) => {
    const updated = [...pairs];
    updated[index][field] = value;
    setPairs(updated);
  };

  const handleSave = () => {
    const dict: Record<string, string> = {};
    pairs.forEach(p => {
      if (p.term.trim() && p.replacement.trim()) {
        dict[p.term.trim()] = p.replacement.trim();
      }
    });
    onSave(voice.id, dict);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pronunciation Dictionary</h3>
              <p className="text-xs text-zinc-400">Custom phonetics for: {voice.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
          {pairs.map((pair, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Term (e.g. Yorùbá)"
                value={pair.term}
                onChange={(e) => handleChange(index, 'term', e.target.value)}
                className="w-1/2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
              <span className="text-zinc-500 font-bold">→</span>
              <input
                type="text"
                placeholder="Phonetic (e.g. Yoruba)"
                value={pair.replacement}
                onChange={(e) => handleChange(index, 'replacement', e.target.value)}
                className="w-1/2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={() => handleRemoveRow(index)}
                className="p-2 text-zinc-500 hover:text-red-400 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            onClick={handleAddRow}
            className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 pt-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Rule</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition"
          >
            <Check className="h-4 w-4" />
            <span>Save Rules</span>
          </button>
        </div>

      </div>
    </div>
  );
};
