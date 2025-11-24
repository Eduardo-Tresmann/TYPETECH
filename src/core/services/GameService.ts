/**
 * Camada de serviço para lógica de jogo
 * Separa a lógica de negócio da UI
 */

import { TypingStats, GameConfig } from '../types';
import { TextGeneratorFactory } from '../factories/TextGeneratorFactory';

export class GameService {
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * Gera texto baseado na configuração atual
   */
  generateText(wordCount: number = 350): string {
    const generator = TextGeneratorFactory.create(this.config.difficulty);
    return generator.generate(wordCount);
  }

  /**
   * Calcula estatísticas de digitação
   */
  calculateStats(
    userInput: string,
    targetText: string,
    elapsedTime: number
  ): TypingStats {
    const correctChars = userInput
      .split('')
      .filter((char, index) => char === targetText[index]).length;
    const incorrectChars = userInput.length - correctChars;
    const accuracy =
      userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
    const elapsedTimeInMinutes = elapsedTime / 60;
    const wpm = Math.round((correctChars / 5) / elapsedTimeInMinutes);

    return {
      wpm: wpm || 0,
      accuracy,
      correctLetters: correctChars,
      incorrectLetters: incorrectChars,
      totalTime: elapsedTime,
    };
  }

  /**
   * Atualiza a configuração do jogo
   */
  updateConfig(config: Partial<GameConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtém a configuração atual
   */
  getConfig(): GameConfig {
    return { ...this.config };
  }
}

