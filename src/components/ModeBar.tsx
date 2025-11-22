import React from 'react';

interface ModeBarProps {
  totalTime: number;
  onSelectTime: (seconds: number) => void;
}

const times = [15, 30, 60, 120];

export default function ModeBar({ totalTime, onSelectTime }: ModeBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {times.map((t) => (
        <button
          key={t}
          onClick={() => onSelectTime(t)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            totalTime === t ? 'bg-[#e2b714] text-[#323437]' : 'bg-[#3a3c3e] text-[#ededed] hover:bg-[#4a4c4e]'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
