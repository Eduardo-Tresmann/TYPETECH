'use client';
import React from 'react';

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-[#323437] flex items-center justify-center px-10 sm:px-16 md:px-24 lg:px-32 xl:px-40">
      <div className="w-full max-w-[90ch]">
        <h1 className="text-white text-3xl font-bold mb-6">Estatísticas</h1>
        <div className="bg-[#2c2e31] rounded p-6 text-white">
          <p className="text-[#d1d1d1]">Em breve: estatísticas de WPM, precisão e histórico.</p>
        </div>
      </div>
    </div>
  );
}
