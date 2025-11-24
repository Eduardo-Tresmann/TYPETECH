import React from 'react';

interface ModeBarProps {
  totalTime: number;
  onSelectTime: (seconds: number) => void;
  disableTab?: boolean;
}

const times = [15, 30, 60, 120];

export default function ModeBar({ totalTime, onSelectTime, disableTab }: ModeBarProps) {
  return (
    <div className="flex items-center justify-center py-1 sm:py-2">
      <div className="inline-flex items-center gap-4 sm:gap-6 px-4 sm:px-5 py-2.5 sm:py-2 rounded-full bg-[#2b2d2f] border border-[#3a3c3f]">
        {times.map(t => (
          <button
            key={t}
            onClick={() => onSelectTime(t)}
            tabIndex={disableTab ? -1 : 0}
            className={`text-base sm:text-sm transition-colors min-h-[44px] min-w-[44px] px-2 sm:px-1 ${
              totalTime === t
                ? 'text-[#e2b714] font-semibold'
                : 'text-[#6b6e70] hover:text-[#e2b714]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
