/**
 * Padrão Strategy para diferentes níveis de dificuldade
 * Define como o texto é gerado e filtrado baseado na dificuldade
 */

import { Difficulty } from '../types';
import { WORDS } from '@/constants/words';

export interface IDifficultyStrategy {
  getWords(): string[];
  getMinWordLength(): number;
  getMaxWordLength(): number;
  getDescription(): string;
}

export class EasyDifficultyStrategy implements IDifficultyStrategy {
  getWords(): string[] {
    // Palavras curtas e comuns (1-4 caracteres)
    return WORDS.filter(word => word.length >= 1 && word.length <= 4 && !word.includes('ç'));
  }

  getMinWordLength(): number {
    return 1;
  }

  getMaxWordLength(): number {
    return 4;
  }

  getDescription(): string {
    return 'Fácil - Palavras curtas e comuns';
  }
}

export class MediumDifficultyStrategy implements IDifficultyStrategy {
  getWords(): string[] {
    // Palavras médias (3-7 caracteres)
    return WORDS.filter(word => word.length >= 3 && word.length <= 7);
  }

  getMinWordLength(): number {
    return 3;
  }

  getMaxWordLength(): number {
    return 7;
  }

  getDescription(): string {
    return 'Médio - Palavras de tamanho médio';
  }
}

export class HardDifficultyStrategy implements IDifficultyStrategy {
  getWords(): string[] {
    // Palavras longas e complexas (5+ caracteres, inclui acentos e caracteres especiais)
    return WORDS.filter(word => word.length >= 5 || word.includes('ç'));
  }

  getMinWordLength(): number {
    return 5;
  }

  getMaxWordLength(): number {
    return 20;
  }

  getDescription(): string {
    return 'Difícil - Palavras longas e complexas';
  }
}

export class DifficultyStrategyFactory {
  static create(difficulty: Difficulty): IDifficultyStrategy {
    switch (difficulty) {
      case 'easy':
        return new EasyDifficultyStrategy();
      case 'medium':
        return new MediumDifficultyStrategy();
      case 'hard':
        return new HardDifficultyStrategy();
      default:
        return new MediumDifficultyStrategy();
    }
  }
}
