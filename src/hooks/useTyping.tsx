import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateText, getLines } from '@/utils/typingUtils';

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
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  totalTime: number;
  setTotalTime: (t: number) => void;
} => {
  const [text, setText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalTime, setTotalTimeState] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  
  const [correctLetters, setCorrectLetters] = useState<number>(0);
  const [incorrectLetters, setIncorrectLetters] = useState<number>(0);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const [maxCharsPerLine, setMaxCharsPerLine] = useState<number>(80);
  const [viewStartLine, setViewStartLine] = useState<number>(0);
  const [resetKey, setResetKey] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(generateText(200));
    const updateMaxChars = () => {
      const el = containerRef.current;
      const containerWidth = el?.clientWidth || window.innerWidth;
      const measureHost = el || document.body;
      const probe = document.createElement('span');
      probe.style.visibility = 'hidden';
      probe.style.position = 'absolute';
      probe.style.whiteSpace = 'nowrap';
      const style = getComputedStyle(measureHost);
      probe.style.fontFamily = style.fontFamily;
      probe.style.fontSize = style.fontSize;
      probe.textContent = '0'.repeat(100);
      measureHost.appendChild(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      const ch = width > 0 ? width / 100 : 0;
      if (ch > 0) {
        const max = Math.max(10, Math.floor(containerWidth / ch) - 2);
        setMaxCharsPerLine(max);
      }
    };
    const raf = requestAnimationFrame(updateMaxChars);
    window.addEventListener('resize', updateMaxChars);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateMaxChars);
    };
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
          const elapsedTimeInMinutes = totalTime / 60;
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
      const elapsedTimeInMinutes = totalTime / 60;
      const finalWpm = Math.round((correctChars / 5) / elapsedTimeInMinutes);
      setWpm(finalWpm);
    }
  }, [isFinished, userInput, text, totalTime]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFinished || !isWindowFocused) return;

    if (!isActive && e.key.length === 1) {
      setIsActive(true);
      
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
    setTimeLeft(totalTime);
    setIsActive(false);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    setCorrectLetters(0);
    setIncorrectLetters(0);
    setViewStartLine(0);
    setResetKey((prev) => prev + 1);
    containerRef.current?.focus();
  };

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(totalTime);
    }
  }, [totalTime, isActive]);

  const setTotalTime = (t: number) => {
    setTotalTimeState(t);
    setTimeLeft(t);
    setIsActive(false);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    setCorrectLetters(0);
    setIncorrectLetters(0);
    setUserInput('');
    setCurrentIndex(0);
    setViewStartLine(0);
    setResetKey((prev) => prev + 1);
  };

  const renderText = () => {
    const lines = getLines(text, maxCharsPerLine);
    const lineStartIndices: number[] = [];
    let currentIdx = 0;
    for (const line of lines) {
      lineStartIndices.push(currentIdx);
      currentIdx += line.length + 1;
    }

    const startLine = Math.max(0, viewStartLine);
    const endLine = Math.min(lines.length, startLine + 3);
    const visibleLines = lines.slice(startLine, endLine);
    const visibleStartIndices = lineStartIndices.slice(startLine, endLine);

    return visibleLines.map((line, lineIdx) => {
      return (
        <div key={lineIdx} className="w-full" style={{ textAlign: 'justify' }}>
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
    containerRef,
    totalTime,
    setTotalTime,
  };
};
