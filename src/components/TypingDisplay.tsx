import React from 'react';

interface TypingDisplayProps {
  timeLeft: number;
  renderText: () => React.ReactNode;
  isWindowFocused: boolean;
  resetTest: () => void;
  resetKey: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  isAnimating: boolean;
}

const TypingDisplay: React.FC<TypingDisplayProps> = ({
  timeLeft,
  renderText,
  isWindowFocused,
  resetTest,
  resetKey,
  containerRef,
  isAnimating,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-1 w-full">
      <div className="w-full mx-auto text-left px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40 2xl:px-48">
        <div className={`text-[#e2b714] text-3xl font-mono mb-1 self-end transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {timeLeft}
        </div>
        <div ref={containerRef} tabIndex={-1} className="text-3xl leading-relaxed font-mono mb-8 text-left relative min-h-[calc(3lh)] max-h-[calc(3lh)] overflow-hidden outline-none focus:outline-none ring-0 focus:ring-0 w-full">
          <div 
            className={`transition-opacity duration-200 ease-in-out ${!isWindowFocused ? 'blur-sm' : ''} ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
          >
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
        <div className={`text-center mb-4 transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <button
            tabIndex={1}
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
