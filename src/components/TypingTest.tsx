'use client';

import React from 'react';
import { useTypingTest } from '../hooks/useTypingTest';
import TypingDisplay from './TypingDisplay';
import ResultsScreen from './ResultsScreen';

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
  } = hook;

  return (
    <div className="min-h-screen bg-[#323437] flex flex-col">
      <div className="flex justify-center py-4">
        <div className="w-full max-w-380 text-left">
          <div className="text-white text-4xl font-bold">TypeTech</div>
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
