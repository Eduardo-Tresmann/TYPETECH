'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const WORDS = [
  'o', 'a', 'e', 'de', 'do', 'da', 'em', 'um', 'para', 'com',
  'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos',
  'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua',
  'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo',
  'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos',
  'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'estão', 'você', 'tinha',
  'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'têm', 'numa',
  'pelos', 'elas', 'havia', 'seja', 'qual', 'será', 'nós', 'tenho', 'lhe', 'deles',
  'essas', 'esses', 'pelas', 'este', 'fosse', 'dele', 'tu', 'te', 'vocês', 'vos',
  'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso', 'nossa', 'nossos',
  'nossas', 'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas',
  'casa', 'tempo', 'ano', 'dia', 'vida', 'homem', 'mulher', 'mundo', 'país', 'cidade',
  'trabalho', 'dinheiro', 'amor', 'amigo', 'família', 'criança', 'pessoa', 'lugar', 'hora', 'mês',
  'semana', 'minuto', 'segundo', 'cor', 'azul', 'vermelho', 'verde', 'amarelo', 'preto', 'branco',
  'grande', 'pequeno', 'alto', 'baixo', 'bom', 'mau', 'novo', 'velho', 'primeiro', 'último',
  'melhor', 'pior', 'rápido', 'lento', 'fácil', 'difícil', 'certo', 'errado', 'feliz', 'triste',
  'rico', 'pobre', 'jovem', 'velho', 'forte', 'fraco', 'doce', 'azedo', 'quente', 'frio',
  'limpo', 'sujo', 'cheio', 'vazio', 'aberto', 'fechado', 'livre', 'ocupado', 'pronto', 'ocupado',
  'importante', 'necessário', 'possível', 'impossível', 'verdadeiro', 'falso', 'real', 'falso', 'certo', 'errado',
  'escola', 'professor', 'aluno', 'livro', 'papel', 'caneta', 'mesa', 'cadeira', 'porta', 'janela',
  'carro', 'ônibus', 'trem', 'avião', 'navio', 'bicicleta', 'estrada', 'rua', 'ponte', 'rio',
  'mar', 'oceano', 'montanha', 'floresta', 'árvore', 'flor', 'grama', 'sol', 'lua', 'estrela',
  'chuva', 'vento', 'nuvem', 'neve', 'fogo', 'água', 'terra', 'ar', 'comida', 'bebida',
  'pão', 'arroz', 'carne', 'peixe', 'fruta', 'legume', 'sopa', 'salada', 'café', 'chá',
  'leite', 'suco', 'cerveja', 'vinho', 'doce', 'bolo', 'sorvete', 'chocolate', 'queijo', 'manteiga'
];

const generateText = (wordCount: number = 40): string => {
  const selectedWords = [];
  for (let i = 0; i < wordCount; i++) {
    selectedWords.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return selectedWords.join(' ');
};

export default function TypingTest() {
  const [text, setText] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(generateText());
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0 && isWindowFocused) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setIsFinished(true);
      calculateFinalStats();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isWindowFocused]);

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
    if (isActive && startTime) {
      const elapsedTime = (Date.now() - startTime) / 1000 / 60; // in minutes
      const wordsTyped = userInput.trim().split(' ').length;
      const currentWpm = Math.round(wordsTyped / elapsedTime);
      setWpm(currentWpm);

      const correctChars = userInput.split('').filter((char, index) => char === text[index]).length;
      const currentAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
      setAccuracy(currentAccuracy);
    }
  }, [userInput, isActive, startTime, text]);

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

  const calculateFinalStats = () => {
    const elapsedTime = (Date.now() - (startTime || Date.now())) / 1000 / 60;
    const wordsTyped = userInput.trim().split(' ').length;
    const finalWpm = Math.round(wordsTyped / elapsedTime);
    setWpm(finalWpm);

    const correctChars = userInput.split('').filter((char, index) => char === text[index]).length;
    const finalAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
    setAccuracy(finalAccuracy);
  };

  const resetTest = () => {
    setText(generateText());
    setUserInput('');
    setCurrentIndex(0);
    setStartTime(null);
    setTimeLeft(30);
    setIsActive(false);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    containerRef.current?.focus();
  };

  const renderText = () => {
    return text.split('').map((char, index) => {
      let className = 'text-[#646669]';
      if (index < userInput.length) {
        className = userInput[index] === char ? 'text-white' : 'text-[#ca4754] bg-[#ca47541a]';
      } else if (index === currentIndex && cursorVisible) {
        className = 'text-[#646669] border-l-2 border-[#e2b714]';
      }
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#323437] flex flex-col items-center justify-center py-4 px-1 focus:outline-none"
      tabIndex={0}
    >
      <div className="w-full max-w-380">
        <div className="text-3xl leading-relaxed font-mono mb-8 text-center relative">
          <div className={`${!isWindowFocused ? 'blur-sm' : ''}`}>
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

        {isFinished && (
          <div className="text-center text-[#d1d0c5]">
            <div className="text-4xl font-bold mb-4">
              {wpm} wpm
            </div>
            <div className="text-lg mb-4">
              accuracy: {accuracy}%
            </div>
            <button
              onClick={resetTest}
              className="bg-[#e2b714] hover:bg-[#f4d03f] text-[#323437] font-bold py-2 px-4 rounded transition duration-300"
            >
              restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
