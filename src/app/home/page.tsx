'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTypingTest } from '@/hooks/useTyping';
import TypingDisplay from '@/components/game/TypingDisplay';
import ResultsScreen from '@/components/game/ResultsScreen';
import ModeBar from '@/components/game/ModeBar';
import RecordNotification from '@/components/game/RecordNotification';
import { useSearchParams, useRouter } from 'next/navigation';

export default function TypingTest() {
  const hook = useTypingTest();
  const {
    timeLeft,
    isFinished,
    wpm,
    accuracy,
    correctLetters,
    incorrectLetters,
    isWindowFocused,
    resetTest,
    renderText,
    resetKey,
    containerRef,
    totalTime,
    setTotalTime,
    isNewRecord,
    recordInfo,
  } = hook;
  const params = useSearchParams();
  const router = useRouter();
  const hasResetRef = useRef(false);
  const resetParam = params.get('reset');
  const [isAnimating, setIsAnimating] = useState(true); // Inicia com animação ativa para o carregamento inicial
  const [frozenContent, setFrozenContent] = useState<React.ReactNode>(null);
  const prevResetKeyRef = useRef(resetKey);
  const hasInitialAnimationRef = useRef(false);
  const [showRecordNotification, setShowRecordNotification] = useState(false);
  const prevIsNewRecordRef = useRef(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isResettingRef = useRef(false);

  useEffect(() => {
    if (resetParam === '1' && !hasResetRef.current) {
      hasResetRef.current = true;
      resetTestWithAnimation();
      router.replace('/home');
    }
  }, [resetParam, router]);

  // Animação inicial ao carregar a página
  useEffect(() => {
    if (!hasInitialAnimationRef.current) {
      hasInitialAnimationRef.current = true;
      // Aguarda um frame para garantir que o conteúdo foi renderizado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Fade in com o conteúdo inicial (mesma duração da animação de reset: 200ms)
          setTimeout(() => {
            setIsAnimating(false);
          }, 200);
        });
      });
    }
  }, []);

  // Função wrapper para reset com animação
  const resetTestWithAnimation = () => {
    // Prevenir múltiplos resets simultâneos
    if (isResettingRef.current) {
      return;
    }
    
    isResettingRef.current = true;
    
    // Cancela qualquer timeout pendente
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    // Congela o conteúdo atual antes do fade out
    setFrozenContent(renderText());

    // Fade out primeiro (texto antigo desaparece)
    setIsAnimating(true);

    // Aguarda o fade out completar (200ms)
    resetTimeoutRef.current = setTimeout(() => {
      // Limpa o conteúdo congelado primeiro
      setFrozenContent(null);
      
      // Troca o texto enquanto está invisível
      resetTest();

      // Aguarda frames para garantir que o novo texto foi renderizado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Fade in com o novo texto
            setIsAnimating(false);
            isResettingRef.current = false;
          });
        });
      });
    }, 200); // Tempo da animação de fade
  };

  // Atualiza o prevResetKey quando resetKey muda
  useEffect(() => {
    if (resetKey !== prevResetKeyRef.current && !isAnimating) {
      prevResetKeyRef.current = resetKey;
    }
  }, [resetKey, isAnimating]);

  // Controlar exibição da notificação de recorde
  useEffect(() => {
    if (isNewRecord && !prevIsNewRecordRef.current && recordInfo) {
      setShowRecordNotification(true);
    }
    prevIsNewRecordRef.current = isNewRecord;
  }, [isNewRecord, recordInfo]);

  // Ajustar altura quando o teclado abrir no mobile
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateViewportHeight = () => {
      if (window.visualViewport) {
        // Usar visualViewport.height quando disponível (detecta teclado)
        setViewportHeight(window.visualViewport.height);
      } else {
        // Fallback para window.innerHeight
        setViewportHeight(window.innerHeight);
      }
    };

    updateViewportHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    } else {
      window.addEventListener('resize', updateViewportHeight);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
        window.visualViewport.removeEventListener('scroll', updateViewportHeight);
      } else {
        window.removeEventListener('resize', updateViewportHeight);
      }
    };
  }, []);

  // Desativar scroll na página home
  useEffect(() => {
    // Desativar scroll no body apenas na página home
    const originalBodyOverflow = window.getComputedStyle(document.body).overflow;
    const originalHtmlOverflow = window.getComputedStyle(document.documentElement).overflow;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlHeight = document.documentElement.style.height;
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.documentElement.style.height = '100%';
    document.body.style.height = '100vh';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    // Prevenir scroll com touch no mobile
    const preventScroll = (e: TouchEvent) => {
      // Permitir scroll apenas em elementos específicos se necessário
      const target = e.target as HTMLElement;
      if (target.closest('[data-allow-scroll]')) {
        return;
      }
      e.preventDefault();
    };
    
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    // Adicionar classe para aplicar estilos específicos da página home
    document.body.classList.add('home-page');
    document.documentElement.classList.add('home-page');
    
    return () => {
      // Remover classe ao sair da página
      document.body.classList.remove('home-page');
      document.documentElement.classList.remove('home-page');
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('wheel', (e) => {
        e.preventDefault();
      });
    };
  }, []);

  // Calcular altura do container considerando o teclado
  const containerHeight = viewportHeight 
    ? `${viewportHeight}px` 
    : 'calc(100vh - 56px)';

  return (
    <div 
      ref={mainContainerRef}
      className="bg-[#323437] flex flex-col overflow-hidden relative" 
      style={{ 
        paddingTop: '56px',
        height: containerHeight,
        minHeight: containerHeight,
        maxHeight: containerHeight,
        touchAction: 'none',
        overscrollBehavior: 'none'
      }}
    >
      {/* Notificação de recorde */}
      {showRecordNotification && isNewRecord && recordInfo && (
        <RecordNotification
          newWpm={wpm}
          previousRecord={recordInfo.previousRecord ?? 0}
          recordType={recordInfo.type || 'overall'}
          duration={recordInfo.type === 'duration' ? totalTime : undefined}
          onClose={() => setShowRecordNotification(false)}
        />
      )}

      {!isFinished ? (
        <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ touchAction: 'none', overscrollBehavior: 'none', height: '100%' }}>
          <div className="flex flex-col items-center justify-center w-full overflow-hidden" style={{ gap: '1rem', transform: 'translateY(-20%)', margin: 0, padding: 0 }}>
            <div
              className={`w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
              style={{ margin: 0 }}
            >
              <ModeBar totalTime={totalTime} onSelectTime={setTotalTime} disableTab />
            </div>
            <TypingDisplay
              key={`typing-display-${resetKey}`}
              timeLeft={timeLeft}
              renderText={frozenContent !== null ? () => frozenContent : renderText}
              isWindowFocused={isWindowFocused}
              resetTest={resetTestWithAnimation}
              resetKey={resetKey}
              containerRef={containerRef}
              isAnimating={isAnimating}
            />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center z-0 overflow-hidden" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
          <ResultsScreen
            key={resetKey}
            wpm={wpm}
            accuracy={accuracy}
            correctLetters={correctLetters}
            incorrectLetters={incorrectLetters}
            resetTest={resetTest}
            resetKey={resetKey}
          />
        </div>
      )}
    </div>
  );
}
