/**
 * Tipos principais do sistema de digitação
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Theme = 'dark' | 'light' | 'monokai' | 'ocean' | 'forest';

export interface GameConfig {
  difficulty: Difficulty;
  duration: number;
  theme: Theme;
  soundEnabled: boolean;
}

export interface TypingStats {
  wpm: number;
  accuracy: number;
  correctLetters: number;
  incorrectLetters: number;
  totalTime: number;
}

export interface TextGeneratorConfig {
  wordCount: number;
  difficulty: Difficulty;
}

