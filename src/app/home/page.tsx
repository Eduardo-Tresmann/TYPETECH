'use client';

import React from 'react';
import { useTypingTest } from '@/hooks/useTyping';
import TypingDisplay from '@/components/TypingDisplay';
import ResultsScreen from '@/components/ResultsScreen';
import ModeBar from '@/components/ModeBar';
import Header from '@/components/Header';

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

  return (
    <div className="min-h-screen bg-[#323437] flex flex-col">
      <Header />
      <div className="flex justify-center">
        <div className="w-full max-w-[110ch] md:max-w-[140ch] lg:max-w-[175ch] xl:max-w-[200ch] 2xl:max-w-[220ch] mx-auto px-6 sm:px-8 lg:px-12">
          <ModeBar totalTime={totalTime} onSelectTime={setTotalTime} />
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {!isFinished ? (
          <TypingDisplay
            key={resetKey}
            timeLeft={timeLeft}
            renderText={renderText}
            isWindowFocused={isWindowFocused}
            resetTest={resetTest}
            resetKey={resetKey}
            containerRef={containerRef}
          />
        ) : (
          <ResultsScreen
            key={resetKey}
            wpm={wpm}
            accuracy={accuracy}
            correctLetters={correctLetters}
            incorrectLetters={incorrectLetters}
            resetTest={resetTest}
            resetKey={resetKey}
          />
        )}
      </div>
    </div>
  );
}
