import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ResetButton from '@/components/game/ResetButton';

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
    <div className="flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 w-full max-w-full min-h-0 overflow-auto">
      <div className="text-center space-y-5 sm:space-y-6 md:space-y-8 w-full">
        {/* WPM Principal - Destaque Maior */}
        <div className="space-y-1 sm:space-y-2 animate-fade-in">
          <div className="text-[#e2b714] text-6xl sm:text-7xl md:text-8xl font-bold leading-none tracking-tight drop-shadow-lg">
            {Math.round(wpm)}
          </div>
          <div className="text-white text-xl sm:text-2xl md:text-3xl font-light opacity-90">WPM</div>
        </div>

        {/* Métricas Secundárias - Grid Responsivo Melhorado */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-sm sm:max-w-md mx-auto w-full px-2">
          <div className="text-center space-y-1 sm:space-y-1.5 bg-[#2b2d2f]/40 rounded-lg py-2 sm:py-3 border border-[#3a3c3f]/50">
            <div className="text-[#e2b714] text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              {Math.round(accuracy)}
            </div>
            <div className="text-white text-xs sm:text-sm font-light opacity-75">%</div>
            <div className="text-[#d1d1d1] text-[10px] sm:text-xs font-normal opacity-60 mt-0.5">
              Precisão
            </div>
          </div>
          <div className="text-center space-y-1 sm:space-y-1.5 bg-[#2b2d2f]/40 rounded-lg py-2 sm:py-3 border border-[#3a3c3f]/50">
            <div className="text-[#e2b714] text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              {correctLetters}
            </div>
            <div className="text-white text-xs sm:text-sm font-light opacity-75">
              {correctLetters === 1 ? 'letra' : 'letras'}
            </div>
            <div className="text-[#d1d1d1] text-[10px] sm:text-xs font-normal opacity-60 mt-0.5">
              Acertos
            </div>
          </div>
          <div className="text-center space-y-1 sm:space-y-1.5 bg-[#2b2d2f]/40 rounded-lg py-2 sm:py-3 border border-[#3a3c3f]/50">
            <div className="text-[#e2b714] text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              {incorrectLetters}
            </div>
            <div className="text-white text-xs sm:text-sm font-light opacity-75">
              {incorrectLetters === 1 ? 'erro' : 'erros'}
            </div>
            <div className="text-[#d1d1d1] text-[10px] sm:text-xs font-normal opacity-60 mt-0.5">
              Erros
            </div>
          </div>
        </div>

        {/* Card de Login/Registro */}
        {!user && (
          <div className="max-w-md mx-auto w-full px-1 sm:px-2">
            <div className="rounded-xl border border-[#3a3c3f] bg-[#2b2d2f]/90 backdrop-blur-sm px-4 sm:px-5 py-4 sm:py-5 space-y-3 sm:space-y-4 shadow-lg">
              <div className="flex items-center justify-center gap-2 text-[#d1d1d1] text-xs sm:text-sm">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
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
                <span className="text-center leading-relaxed">
                  Salve seus resultados e entre no ranking
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full text-sm sm:text-base transition-all bg-[#e2b714] text-black hover:bg-[#d4c013] active:bg-[#c4b012] active:scale-95 font-semibold shadow-lg hover:shadow-xl"
                >
                  Entrar
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-full text-sm sm:text-base transition-all border-2 border-[#3a3c3f] text-[#d1d1d1] hover:bg-[#2b2d2f] hover:border-[#4a4c4f] active:bg-[#1f2022] active:scale-95 font-medium"
                >
                  Registrar
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Reiniciar */}
        <div className="pt-3 sm:pt-5" key={`button-${resetKey}`}>
          <ResetButton
            text="Reiniciar"
            onClick={resetTest}
            className="py-3.5 sm:py-4 px-10 sm:px-12 text-base sm:text-lg bg-[#e2b714] text-black rounded-full hover:bg-[#d4c013] active:bg-[#c4b012] active:scale-95 transition-all min-h-[52px] min-w-[160px] font-bold shadow-xl hover:shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
