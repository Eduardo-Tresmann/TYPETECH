import React from 'react';
import ResetButton from '@/shared/components/ResetButton';

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
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 pt-16">
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
