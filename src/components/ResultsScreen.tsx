import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ResetButton from '@/components/ResetButton';

interface ResultsScreenProps {
  wpm: number;
  accuracy: number;
  correctLetters: number;
  incorrectLetters: number;
  resetTest: () => void;
  resetKey: number;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  wpm,
  accuracy,
  correctLetters,
  incorrectLetters,
  resetTest,
  resetKey,
}) => {
  const { user } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <div className="text-yellow-400 text-6xl font-bold">{wpm}</div>
          <div className="text-white text-2xl font-light">WPM</div>
        </div>
        <div className="flex justify-center space-x-8">
          <div className="text-center space-y-1">
            <div className="text-yellow-400 text-2xl">{accuracy}%</div>
            <div className="text-white text-lg font-light">Precisão</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-yellow-400 text-2xl">{correctLetters}</div>
            <div className="text-white text-lg font-light">Acertos</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-yellow-400 text-2xl">{incorrectLetters}</div>
            <div className="text-white text-lg font-light">Erros</div>
          </div>
        </div>
        {!user && (
          <div className="max-w-[60ch] mx-auto">
            <div className="rounded-xl border border-[#3a3c3f] bg-[#2b2d2f]/60 backdrop-blur-sm px-5 py-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-[#d1d1d1] text-sm">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2l3 7h7l-6 4 3 7-6-4-6 4 3-7-6-4h7l3-7z"
                    stroke="#e2b714"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Salve seus resultados e entre no ranking</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center h-8 px-4 rounded-full text-sm transition-colors bg-[#e2b714] text-black hover:bg-[#d4c013]"
                >
                  Entrar
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center h-8 px-4 rounded-full text-sm transition-colors border border-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f]"
                >
                  Registrar
                </Link>
              </div>
            </div>
          </div>
        )}
        <div className="pt-4" key={`button-${resetKey}`}>
          <ResetButton
            text="Reiniciar"
            onClick={resetTest}
            className="py-3 px-6 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
