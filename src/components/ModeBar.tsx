import React from 'react';

interface ModeBarProps {
  totalTime: number;
  onSelectTime: (seconds: number) => void;
  disableTab?: boolean;
}

const times = [15, 30, 60, 120];

export default function ModeBar({ totalTime, onSelectTime, disableTab }: ModeBarProps) {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="inline-flex items-center gap-6 px-5 py-2 rounded-full bg-[#2b2d2f] border border-[#3a3c3f]">
        {times.map((t) => (
          <button
            key={t}
            onClick={() => onSelectTime(t)}
            tabIndex={disableTab ? -1 : 0}
            className={`text-sm transition-colors ${
              totalTime === t ? 'text-[#e2b714] font-semibold' : 'text-[#6b6e70] hover:text-[#e2b714]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
