import React, { useRef, useEffect } from 'react';
import { useSound } from '@/hooks/useSound';

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
  const { playClick } = useSound();
  const inputRef = useRef<HTMLInputElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Foca o input quando o componente monta ou quando resetKey muda
    if (!isAnimating && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300); // Aumentado para garantir que a animação terminou
      return () => clearTimeout(timer);
    }
  }, [isAnimating, resetKey]);

  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Interceptar Tab para focar o botão de reiniciar
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      resetButtonRef.current?.focus();
      return;
    }
    
    // Previne comportamento padrão para todas as outras teclas
    e.preventDefault();
    e.stopPropagation();
    
    const now = Date.now();
    const timeDiff = now - lastKeyTimeRef.current;
    
    // Prevenir duplicação: mesma tecla em menos de 30ms (muito rápido para ser duplicado)
    if (timeDiff < 30) {
      return;
    }
    
    lastKeyTimeRef.current = now;
    
    // Dispara o evento para o handler global
    const keyEvent = new KeyboardEvent('keydown', {
      key: e.key,
      bubbles: true,
      cancelable: true,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
    
    document.dispatchEvent(keyEvent);
  };

  return (
    <div className="flex flex-col items-center justify-center px-1 w-full" style={{ margin: 0 }}>
      <div className="w-full mx-auto text-left px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20" style={{ margin: 0 }}>
        <div
          className={`text-[#e2b714] text-xl sm:text-2xl md:text-3xl font-mono mb-1 sm:mb-2 self-end transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
        >
          {timeLeft}
        </div>
        <div className="relative w-full">
          <div
            ref={containerRef}
            tabIndex={-1}
            onTouchStart={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
            onClick={() => {
              inputRef.current?.focus();
            }}
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl leading-relaxed font-mono relative min-h-[calc(3lh)] max-h-[calc(3lh)] overflow-hidden outline-none focus:outline-none ring-0 focus:ring-0 w-full cursor-text"
            style={{ pointerEvents: 'none' }}
          >
          {/* Input invisível para capturar teclado no mobile */}
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            inputMode="text"
            className="absolute inset-0 w-full h-full z-10"
            style={{ 
              opacity: 0,
              caretColor: 'transparent',
              fontSize: '16px', // Prevenir zoom no iOS
              color: 'transparent',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              pointerEvents: 'auto',
              cursor: 'text'
            }}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              // Captura input direto (melhor para mobile)
              const target = e.target as HTMLInputElement;
              const value = target.value;
              
              if (value.length > 0) {
                // Processa cada caractere
                for (let i = 0; i < value.length; i++) {
                  const char = value[i];
                  const keyEvent = new KeyboardEvent('keydown', {
                    key: char,
                    bubbles: true,
                    cancelable: true,
                  });
                  document.dispatchEvent(keyEvent);
                }
                // Limpa o input para capturar o próximo caractere
                target.value = '';
              }
            }}
            onBlur={(e) => {
              // Re-foca quando perde o foco (exceto se estiver clicando em outro lugar)
              if (isWindowFocused && !isAnimating) {
                setTimeout(() => {
                  if (document.activeElement !== e.relatedTarget) {
                    inputRef.current?.focus();
                  }
                }, 100);
              }
            }}
          />
          <div
            className={`transition-opacity duration-200 ease-in-out ${!isWindowFocused ? 'blur-sm' : ''} ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
          >
            {renderText()}
          </div>
          {!isWindowFocused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-sm sm:text-base md:text-lg lg:text-xl font-semibold px-4 sm:px-6 py-2 sm:py-3 text-center">
                Pressione qualquer tecla para continuar!
              </div>
            </div>
          )}
          </div>
        </div>
        <div
          className={`text-center mt-2 sm:mt-3 transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
        >
          <button
            ref={resetButtonRef}
            tabIndex={1}
            onClick={e => {
              playClick();
              resetTest();
              e.currentTarget.blur();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                playClick();
                resetTest();
                e.currentTarget.blur();
              }
            }}
            className="py-3 px-6 sm:py-2 sm:px-4 text-base sm:text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors min-h-[44px] min-w-[44px]"
          >
            Reiniciar
          </button>
          <div
            className={`mt-6 sm:mt-8 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono text-[#d1d1d1] transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
          >
            <span className="px-2 py-0.5 rounded bg-[#3b3d40] text-[#d1d1d1]">
              tab
            </span>
            <span className="text-[#d1d1d1]">+</span>
            <span className="px-2 py-0.5 rounded bg-[#3b3d40] text-[#d1d1d1]">
              enter
            </span>
            <span className="text-[#d1d1d1]">-</span>
            <span className="text-[#d1d1d1]">reiniciar teste</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingDisplay;
