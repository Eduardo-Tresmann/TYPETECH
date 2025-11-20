import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateText, getLines, calculateFinalStats } from '../utils/typingUtils';

export const useTypingTest = (): {
  timeLeft: number;
  isFinished: boolean;
  wpm: number;
  accuracy: number;
  correctLetters: number;
  incorrectLetters: number;
  isWindowFocused: boolean;
  resetTest: () => void;
  renderText: () => React.ReactNode;
  resetKey: number;
} => {
  const [text, setText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [finalWordsTyped, setFinalWordsTyped] = useState<number>(0);
  const [correctLetters, setCorrectLetters] = useState<number>(0);
  const [incorrectLetters, setIncorrectLetters] = useState<number>(0);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const [maxCharsPerLine, setMaxCharsPerLine] = useState<number>(80);
  const [viewStartLine, setViewStartLine] = useState<number>(0);
  const [resetKey, setResetKey] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(generateText(200)); // Start with 200 words
    const updateMaxChars = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setMaxCharsPerLine(40);
      } else if (width < 1024) {
        setMaxCharsPerLine(60);
      } else {
        setMaxCharsPerLine(80);
      }
    };
    updateMaxChars();
    window.addEventListener('resize', updateMaxChars);
    return () => window.removeEventListener('resize', updateMaxChars);
  }, []);

  useEffect(() => {
    if (currentIndex > text.length - 100) {
      setText((prevText) => prevText + ' ' + generateText(50)); // Append 50 more words
    }
  }, [currentIndex, text.length]);

  useEffect(() => {
    if (!isActive || !isWindowFocused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          setIsFinished(true);
          const correctChars = userInput.split('').filter((char, index) => char === text[index]).length;
          const incorrectChars = userInput.length - correctChars;
          setCorrectLetters(correctChars);
          setIncorrectLetters(incorrectChars);
          const finalAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
          setAccuracy(finalAccuracy);
          const elapsedTimeInMinutes = 15 / 60;
          const finalWpm = Math.round((correctChars / 5) / elapsedTimeInMinutes);
          setWpm(finalWpm);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isWindowFocused]);

  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!isWindowFocused) {
      const cursorInterval = setInterval(() => {
        setCursorVisible((prev) => !prev);
      }, 530);
      return () => clearInterval(cursorInterval);
    } else {
      setCursorVisible(true);
    }
  }, [isWindowFocused]);

  useEffect(() => {
    // Auto-scroll logic: when user finishes the second line, jump to the next line
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (testLine.length > maxCharsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    let currentLineIndex = 0;
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1;
      if (currentIndex < charCount) {
        currentLineIndex = i;
        break;
      }
    }

    if (currentLineIndex >= 2 && viewStartLine < currentLineIndex - 1) {
      setViewStartLine(currentLineIndex - 1);
    }
  }, [text, currentIndex, maxCharsPerLine, viewStartLine]);

  useEffect(() => {
    if (isFinished) {
      const correctChars = userInput.split('').filter((char, index) => char === text[index]).length;
      const incorrectChars = userInput.length - correctChars;
      setCorrectLetters(correctChars);
      setIncorrectLetters(incorrectChars);
      const finalAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
      setAccuracy(finalAccuracy);
      const elapsedTimeInMinutes = 15 / 60;
      const finalWpm = Math.round((correctChars / 5) / elapsedTimeInMinutes);
      setWpm(finalWpm);
    }
  }, [isFinished, userInput, text]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFinished || !isWindowFocused) return;

    if (!isActive && e.key.length === 1) {
      setIsActive(true);
      setStartTime(Date.now());
    }

    if (e.key === 'Backspace') {
      setUserInput((prev) => prev.slice(0, -1));
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      setUserInput((prev) => prev + e.key);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isActive, isFinished, isWindowFocused]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetTest = () => {
    setText(generateText(200));
    setUserInput('');
    setCurrentIndex(0);
    setStartTime(null);
    setTimeLeft(15);
    setIsActive(false);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    setFinalWordsTyped(0);
    setCorrectLetters(0);
    setIncorrectLetters(0);
    setViewStartLine(0);
    setResetKey((prev) => prev + 1);
    containerRef.current?.focus();
  };

  const renderText = () => {
    const lines = getLines(text, maxCharsPerLine);
    const lineStartIndices: number[] = [];
    let currentIdx = 0;
    for (const line of lines) {
      lineStartIndices.push(currentIdx);
      currentIdx += line.length + 1;
    }

    // Show current line and next 2 lines, but adjust for viewStartLine
    const startLine = Math.max(0, viewStartLine);
    const endLine = Math.min(lines.length, startLine + 3);
    const visibleLines = lines.slice(startLine, endLine);
    const visibleStartIndices = lineStartIndices.slice(startLine, endLine);

    return visibleLines.map((line, lineIdx) => {
      return (
        <div key={lineIdx}>
          {line.split('').map((char, charIdx) => {
            const globalIndex = visibleStartIndices[lineIdx] + charIdx;
            let className = 'text-[#646669]';
            if (globalIndex < userInput.length) {
              className = userInput[globalIndex] === char ? 'text-white' : 'text-[#ca4754] bg-[#ca47541a]';
            } else if (globalIndex === currentIndex && cursorVisible) {
              className = 'text-[#646669] border-l-2 border-[#e2b714]';
            }
            return (
              <span key={globalIndex} className={className}>
                {char}
              </span>
            );
          })}
        </div>
      );
    });
  };

  return {
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
  };
};
