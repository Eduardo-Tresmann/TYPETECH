/**
 * Hook para gerenciar configuração do jogo
 * Persiste preferências do usuário no localStorage
 */

import { useState, useEffect } from 'react';
import { GameConfig, Difficulty, Theme } from '@/core/types';

const DEFAULT_CONFIG: GameConfig = {
  difficulty: 'medium',
  duration: 15,
  theme: 'dark',
  soundEnabled: true,
};

const STORAGE_KEY = 'typetech-game-config';

export function useGameConfig() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega configuração do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
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

  return {
    config,
    isLoaded,
    updateConfig,
    setDifficulty,
    setDuration,
    setTheme,
    setSoundEnabled,
  };
}
