'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTypingTest } from '@/hooks/useTyping';
import TypingDisplay from '@/components/TypingDisplay';
import ResultsScreen from '@/components/ResultsScreen';
import ModeBar from '@/components/ModeBar';
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
  } = hook;
  const params = useSearchParams();
  const router = useRouter();
  const hasResetRef = useRef(false);
  const resetParam = params.get('reset');
  const [isAnimating, setIsAnimating] = useState(false);
  const [frozenContent, setFrozenContent] = useState<React.ReactNode>(null);
  const prevResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (resetParam === '1' && !hasResetRef.current) {
      hasResetRef.current = true;
      resetTest();
      router.replace('/home');
    }
  }, [resetParam, resetTest, router]);

  // Função wrapper para reset com animação
  const resetTestWithAnimation = () => {
    // Congela o conteúdo atual antes do fade out
    setFrozenContent(renderText());
    
    // Fade out primeiro (texto antigo desaparece)
    setIsAnimating(true);
    
    // Aguarda o fade out completar (200ms)
    setTimeout(() => {
      // Troca o texto enquanto está invisível
      resetTest();
      
      // Limpa o conteúdo congelado e permite renderizar o novo
      setFrozenContent(null);
      
      // Aguarda um frame para garantir que o novo texto foi renderizado
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Fade in com o novo texto
          setIsAnimating(false);
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

  return (
    <div className="min-h-screen bg-[#323437] flex flex-col overflow-hidden relative">
      
      {!isFinished ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center w-full">
            <div className={`w-full mx-auto px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40 2xl:px-48 transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
              <ModeBar totalTime={totalTime} onSelectTime={setTotalTime} disableTab />
            </div>
            <TypingDisplay
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
        <div className="absolute inset-0 flex items-center justify-center z-0">
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
