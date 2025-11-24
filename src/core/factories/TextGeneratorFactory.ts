/**
 * Padrão Factory para geração de texto
 * Centraliza a lógica de geração de texto com diferentes estratégias
 */

import { Difficulty } from '../types';
import { DifficultyStrategyFactory, IDifficultyStrategy } from '../strategies/DifficultyStrategy';

export interface ITextGenerator {
  generate(wordCount: number): string;
}

export class RandomTextGenerator implements ITextGenerator {
  private strategy: IDifficultyStrategy;

  constructor(difficulty: Difficulty) {
    this.strategy = DifficultyStrategyFactory.create(difficulty);
  }

  generate(wordCount: number): string {
    const words = this.strategy.getWords();
    if (words.length === 0) {
      throw new Error('Nenhuma palavra disponível para a dificuldade selecionada');
    }

    const selectedWords: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      const randomIndex = Math.floor(Math.random() * words.length);
      selectedWords.push(words[randomIndex]);
    }

    return selectedWords.join(' ');
  }
}

export class TextGeneratorFactory {
  static create(difficulty: Difficulty): ITextGenerator {
    return new RandomTextGenerator(difficulty);
  }
}
