import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateText, getLines } from '@/utils/typingUtils';
import { saveTypingResult, getUserPersonalBest } from '@/lib/db';
import { getSupabase } from '@/lib/supabaseClient';

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
  isNewRecord: boolean;
  recordInfo: { type: 'overall' | 'duration' | null; previousRecord: number | null } | null;
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
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [recordInfo, setRecordInfo] = useState<{
    type: 'overall' | 'duration' | null;
    previousRecord: number | null;
  } | null>(null);

  useEffect(() => {
    setText(generateText(350));
    const updateMaxChars = () => {
      const el = containerRef.current;
      if (!el) return;

      const containerWidth = el.clientWidth;
      if (containerWidth <= 0) return;

      const probe = document.createElement('span');
      probe.style.visibility = 'hidden';
      probe.style.position = 'absolute';
      probe.style.whiteSpace = 'nowrap';
      probe.style.top = '0';
      probe.style.left = '0';
      const style = getComputedStyle(el);
      probe.style.fontFamily = style.fontFamily;
      probe.style.fontSize = style.fontSize;
      probe.style.fontWeight = style.fontWeight;
      probe.style.letterSpacing = style.letterSpacing;
      probe.textContent = '0'.repeat(100);
      el.appendChild(probe);
      const charWidth = probe.getBoundingClientRect().width / 100;
      probe.remove();

      if (charWidth > 0) {
        // Usa toda a largura disponível, sem subtrair caracteres
        const max = Math.max(10, Math.floor(containerWidth / charWidth));
        setMaxCharsPerLine(max);
      }
    };

    const updateWithDelay = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(updateMaxChars);
      });
    };

    // Recalcula quando a janela é redimensionada
    window.addEventListener('resize', updateWithDelay);

    // Recalcula quando o container muda de tamanho (ResizeObserver)
    const resizeObserver = new ResizeObserver(() => {
      updateWithDelay();
    });

    // Observa o container quando ele estiver disponível
    const checkAndObserve = () => {
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
        updateWithDelay();
      }
    };

    // Tenta observar imediatamente
    checkAndObserve();

    // Tenta novamente após um pequeno delay para garantir que o elemento está montado
    const timeoutId = setTimeout(checkAndObserve, 100);

    return () => {
      window.removeEventListener('resize', updateWithDelay);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (currentIndex > text.length - 150) {
      setText(prevText => prevText + ' ' + generateText(100));
    }
  }, [currentIndex, text.length]);

  useEffect(() => {
    if (!isActive || !isWindowFocused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsActive(false);
          setIsFinished(true);
          const correctChars = userInput
            .split('')
            .filter((char, index) => char === text[index]).length;
          const incorrectChars = userInput.length - correctChars;
          setCorrectLetters(correctChars);
          setIncorrectLetters(incorrectChars);
          const finalAccuracy =
            userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
          setAccuracy(finalAccuracy);
          const elapsedTimeInMinutes = totalTime / 60;
          const finalWpm = Math.round(correctChars / 5 / elapsedTimeInMinutes);
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
        setCursorVisible(prev => !prev);
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
      const finalAccuracy =
        userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
      setAccuracy(finalAccuracy);
      const elapsedTimeInMinutes = totalTime / 60;
      const finalWpm = Math.round(correctChars / 5 / elapsedTimeInMinutes);
      setWpm(finalWpm);

      // Verificar recorde e persistir resultado
      (async () => {
        const supabase = getSupabase();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        let newRecord = false;
        let recordType: 'overall' | 'duration' | null = null;
        let previousRecord: number | null = null;

        if (user) {
          // Buscar recorde pessoal antes de salvar
          const personalBest = await getUserPersonalBest(user.id);

          // Verificar se bateu recorde geral
          if (personalBest.overall === null || finalWpm > personalBest.overall) {
            newRecord = true;
            recordType = 'overall';
            previousRecord = personalBest.overall;
          }
          // Verificar se bateu recorde específico da duração
          else if (
            personalBest.byTime[totalTime] === null ||
            finalWpm > (personalBest.byTime[totalTime] ?? 0)
          ) {
            newRecord = true;
            recordType = 'duration';
            previousRecord = personalBest.byTime[totalTime];
          }

          if (newRecord) {
            setIsNewRecord(true);
            setRecordInfo({ type: recordType, previousRecord });
          } else {
            setIsNewRecord(false);
            setRecordInfo(null);
          }
        }

        // Persistir resultado
        await saveTypingResult({
          total_time: totalTime,
          wpm: finalWpm,
          accuracy: finalAccuracy,
          correct_letters: correctChars,
          incorrect_letters: incorrectChars,
        });
      })();
    }
  }, [isFinished, userInput, text, totalTime]);

  const lastProcessedKeyRef = useRef<{ key: string; time: number } | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isFinished || !isWindowFocused) return;

      const now = Date.now();
      const lastProcessed = lastProcessedKeyRef.current;
      
      // Prevenir processamento duplicado: mesma tecla em menos de 50ms
      if (lastProcessed && 
          lastProcessed.key === e.key && 
          (now - lastProcessed.time) < 50) {
        return;
      }
      
      lastProcessedKeyRef.current = { key: e.key, time: now };

      if (!isActive && e.key.length === 1) {
        setIsActive(true);
      }

      if (e.key === 'Backspace') {
        setUserInput(prev => prev.slice(0, -1));
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setUserInput(prev => prev + e.key);
        setCurrentIndex(prev => prev + 1);
      }
    },
    [isActive, isFinished, isWindowFocused]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetTest = useCallback(() => {
    // Limpa todos os estados primeiro
    setUserInput('');
    setCurrentIndex(0);
    setIsActive(false);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    setCorrectLetters(0);
    setIncorrectLetters(0);
    setViewStartLine(0);
    setIsNewRecord(false);
    setRecordInfo(null);
    setTimeLeft(totalTime);
    
    // Gera novo texto após limpar estados
    const newText = generateText(350);
    setText(newText);
    
    // Incrementa resetKey para forçar re-render completo
    setResetKey(prev => prev + 1);
    
    // Foca o container após um pequeno delay
    setTimeout(() => {
      containerRef.current?.focus();
    }, 0);
  }, [totalTime]);

  useEffect(() => {
    const onGlobalReset = () => resetTest();
    window.addEventListener('typetech:reset', onGlobalReset as EventListener);
    return () => {
      window.removeEventListener('typetech:reset', onGlobalReset as EventListener);
    };
  }, [resetTest]);

  useEffect(() => {
    (window as any).typetechReset = () => resetTest();
    return () => {
      try {
        delete (window as any).typetechReset;
      } catch {}
    };
  }, [resetTest]);

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
    setResetKey(prev => prev + 1);
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
      // Divide a linha em palavras para aplicar justificação
      const words = line.split(' ');
      let charOffset = 0;
      
      return (
        <div 
          key={lineIdx} 
          className="w-full"
          style={{ 
            textAlign: 'justify',
            textAlignLast: 'justify',
            textJustify: 'inter-word'
          }}
        >
          {words.map((word, wordIdx) => {
            const wordStartIndex = visibleStartIndices[lineIdx] + charOffset;
            const wordElements = word.split('').map((char, charIdx) => {
              const globalIndex = wordStartIndex + charIdx;
              let className = 'text-[#646669]';
              if (globalIndex < userInput.length) {
                className =
                  userInput[globalIndex] === char ? 'text-white' : 'text-[#ca4754] bg-[#ca47541a]';
              } else if (globalIndex === currentIndex && cursorVisible) {
                className = 'text-[#646669] border-l-2 border-[#e2b714]';
              }
              return (
                <span key={globalIndex} className={className}>
                  {char}
                </span>
              );
            });
            
            charOffset += word.length + (wordIdx < words.length - 1 ? 1 : 0);
            
            return (
              <span key={wordIdx} style={{ whiteSpace: 'nowrap' }}>
                {wordElements}
                {wordIdx < words.length - 1 && ' '}
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
    isNewRecord,
    recordInfo,
  };
};
