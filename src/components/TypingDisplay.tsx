import React from 'react';

interface TypingDisplayProps {
  timeLeft: number;
  renderText: () => React.ReactNode;
  isWindowFocused: boolean;
  resetTest: () => void;
  resetKey: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
}

const TypingDisplay: React.FC<TypingDisplayProps> = ({
  timeLeft,
  renderText,
  isWindowFocused,
  resetTest,
  resetKey,
  containerRef,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-1">
      <div className="w-full max-w-none mx-auto text-left px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
        <div className="text-[#e2b714] text-3xl font-mono mb-1 self-end">
          {timeLeft}
        </div>
        <div ref={containerRef} tabIndex={-1} className="text-3xl leading-relaxed font-mono mb-8 text-left relative min-h-[calc(3lh)] max-h-[calc(3lh)] overflow-hidden">
          <div className={`${!isWindowFocused ? 'blur-sm' : ''}`}>
            {renderText()}
          </div>
          {!isWindowFocused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-xl font-semibold px-6 py-3">
                Pressione qualquer tecla para continuar!
              </div>
            </div>
          )}
        </div>
        <div className="text-center mb-4" key={`button-${resetKey}`}>
          <button
            onClick={(e) => {
              resetTest();
              e.currentTarget.blur();
            }}
            className="py-2 px-4 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors"
          >
            Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TypingDisplay;
