'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameConfig, Difficulty, Theme } from '@/core/types';

const DEFAULT_CONFIG: GameConfig = {
  difficulty: 'medium',
  duration: 15,
  theme: 'dark',
  soundEnabled: true,
  typingSoundEnabled: true,
  interfaceSoundEnabled: true,
  typingVolume: 0.5,
  interfaceVolume: 0.5,
};

const STORAGE_KEY = 'typetech-game-config';

interface GameConfigContextType {
  config: GameConfig;
  isLoaded: boolean;
  setDifficulty: (difficulty: Difficulty) => void;
  setDuration: (duration: number) => void;
  setTheme: (theme: Theme) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTypingSoundEnabled: (enabled: boolean) => void;
  setInterfaceSoundEnabled: (enabled: boolean) => void;
  setTypingVolume: (volume: number) => void;
  setInterfaceVolume: (volume: number) => void;
  updateConfig: (updates: Partial<GameConfig>) => void;
}

const GameConfigContext = createContext<GameConfigContextType | undefined>(undefined);

export function GameConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega configuração do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const migrated = { ...DEFAULT_CONFIG, ...parsed };
          if (parsed.soundEnabled !== undefined && parsed.typingSoundEnabled === undefined) {
            migrated.typingSoundEnabled = parsed.soundEnabled;
            migrated.interfaceSoundEnabled = parsed.soundEnabled;
          }
          if (parsed.typingVolume === undefined) {
            migrated.typingVolume = DEFAULT_CONFIG.typingVolume;
          }
          if (parsed.interfaceVolume === undefined) {
            migrated.interfaceVolume = DEFAULT_CONFIG.interfaceVolume;
          }
          setConfig(migrated);
        }
      } catch (error) {
        console.warn('Erro ao carregar configuração:', error);
      }
      setIsLoaded(true);
    }
  }, []);

  // Salva configuração no localStorage
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        // Disparar evento para atualizar todos os componentes
        window.dispatchEvent(new CustomEvent('typetech:configUpdated', { detail: config }));
      } catch (error) {
        console.warn('Erro ao salvar configuração:', error);
      }
    }
  }, [config, isLoaded]);

  const updateConfig = (updates: Partial<GameConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const setDifficulty = (difficulty: Difficulty) => {
    updateConfig({ difficulty });
  };

  const setDuration = (duration: number) => {
    updateConfig({ duration });
  };

  const setTheme = (theme: Theme) => {
    updateConfig({ theme });
  };

  const setSoundEnabled = (enabled: boolean) => {
    updateConfig({ soundEnabled: enabled });
  };

  const setTypingSoundEnabled = (enabled: boolean) => {
    updateConfig({ typingSoundEnabled: enabled });
  };

  const setInterfaceSoundEnabled = (enabled: boolean) => {
    updateConfig({ interfaceSoundEnabled: enabled });
  };

  const setTypingVolume = (volume: number) => {
    updateConfig({ typingVolume: Math.max(0, Math.min(1, volume)) });
  };

  const setInterfaceVolume = (volume: number) => {
    updateConfig({ interfaceVolume: Math.max(0, Math.min(1, volume)) });
  };

  return (
    <GameConfigContext.Provider
      value={{
        config,
        isLoaded,
        setDifficulty,
        setDuration,
        setTheme,
        setSoundEnabled,
        setTypingSoundEnabled,
        setInterfaceSoundEnabled,
        setTypingVolume,
        setInterfaceVolume,
        updateConfig,
      }}
    >
      {children}
    </GameConfigContext.Provider>
  );
}

export function useGameConfig() {
  const context = useContext(GameConfigContext);
  if (context === undefined) {
    throw new Error('useGameConfig deve ser usado dentro de GameConfigProvider');
  }
  return context;
}


