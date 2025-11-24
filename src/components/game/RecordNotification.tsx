'use client';

import React, { useEffect, useState } from 'react';

interface RecordNotificationProps {
  newWpm: number;
  previousRecord: number;
  recordType: 'overall' | 'duration';
  duration?: number;
  onClose: () => void;
}

const RecordNotification: React.FC<RecordNotificationProps> = ({
  newWpm,
  previousRecord,
  recordType,
  duration,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animação de entrada
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const getDurationLabel = (dur?: number) => {
    if (!dur) return '';
    const labels: Record<number, string> = {
      15: '15s',
      30: '30s',
      60: '60s',
      120: '120s',
    };
    return labels[dur] || '';
  };

  const isFirstRecord = previousRecord === 0;
  const improvement = isFirstRecord ? newWpm : newWpm - previousRecord;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ease-out ${
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Overlay escuro de fundo */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(), 300);
        }}
      ></div>

      {/* Notificação centralizada */}
      <div
        className={`relative bg-gradient-to-br from-[#e2b714] via-[#d4c013] to-[#c4a812] rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[400px] border-2 border-[#f5d020] transition-all duration-300 ease-out ${
          isVisible && !isExiting ? 'scale-100 translate-y-0' : 'scale-95 translate-y-[-20px]'
        }`}
      >
        {/* Efeito de brilho animado */}
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"
          style={{
            animation: 'shimmer 2s infinite',
          }}
        ></div>

        {/* Conteúdo */}
        <div className="relative z-10">
          {/* Cabeçalho com ícone */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-black"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              {/* Partículas animadas ao redor do ícone */}
              <div className="absolute inset-0 rounded-full animate-ping opacity-20">
                <div className="w-full h-full rounded-full border-2 border-black/30"></div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-black font-bold text-lg leading-tight">Novo Recorde!</h3>
              {recordType === 'duration' && duration && (
                <p className="text-black/70 text-sm">{getDurationLabel(duration)}</p>
              )}
            </div>
            <button
              onClick={() => {
                setIsExiting(true);
                setTimeout(() => onClose(), 300);
              }}
              className="text-black/70 hover:text-black hover:bg-black/20 rounded-full p-2 transition-all duration-200 flex items-center justify-center"
              aria-label="Fechar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* WPM destacado */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-black/70 text-sm font-medium">WPM:</span>
              <span className="text-black text-4xl font-bold">{newWpm}</span>
            </div>
          </div>

          {/* Melhoria */}
          <div className="bg-black/10 rounded-lg px-4 py-2 mb-2">
            {isFirstRecord ? (
              <div className="text-center">
                <span className="text-black/70 text-sm">Primeiro recorde registrado!</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-black/70 text-sm">Recorde anterior:</span>
                  <span className="text-black font-semibold">{previousRecord} WPM</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-black/70 text-sm">Melhoria:</span>
                  <span className="text-black font-bold text-lg">+{improvement} WPM</span>
                </div>
              </>
            )}
          </div>

          {/* Barra de progresso visual */}
          <div className="mt-3">
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-black/40 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (newWpm / 200) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Efeito de sombra animada */}
        <div className="absolute inset-0 rounded-xl shadow-[0_0_30px_rgba(226,183,20,0.5)] pointer-events-none"></div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default RecordNotification;
