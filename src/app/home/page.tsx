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
  const prevResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (resetParam === '1' && !hasResetRef.current) {
      hasResetRef.current = true;
      resetTest();
      router.replace('/home');
    }
  }, [resetParam, resetTest, router]);

  useEffect(() => {
    if (resetKey !== prevResetKeyRef.current) {
      const oldKey = prevResetKeyRef.current;
      prevResetKeyRef.current = resetKey;
      
      // Fade out primeiro
      setIsAnimating(true);
      
      // Aguarda o fade out completar (200ms), depois aguarda mais um pouco para o novo conteúdo ser renderizado
      const timer = setTimeout(() => {
        // Força um re-render para garantir que o novo texto seja renderizado antes do fade in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsAnimating(false);
          });
        });
      }, 250);
      
      return () => clearTimeout(timer);
    }
  }, [resetKey]);

  return (
    <div className="min-h-screen bg-[#323437] flex flex-col overflow-hidden relative">
      
      {!isFinished ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className={`w-full max-w-[110ch] md:max-w-[140ch] lg:max-w-[175ch] xl:max-w-[200ch] 2xl:max-w-[220ch] mx-auto px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40 transition-opacity duration-200 ease-in-out ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
              <ModeBar totalTime={totalTime} onSelectTime={setTotalTime} disableTab />
            </div>
            <TypingDisplay
              timeLeft={timeLeft}
              renderText={renderText}
              isWindowFocused={isWindowFocused}
              resetTest={resetTest}
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
