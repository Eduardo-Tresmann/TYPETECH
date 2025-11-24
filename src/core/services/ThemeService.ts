/**
 * Serviço de temas
 * Gerencia temas visuais (cores, fontes, skins)
 */

import { Theme } from '../types';

export interface ThemeConfig {
  name: string;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    textCorrect: string;
    textIncorrect: string;
    textCursor: string;
    accent: string;
    border: string;
  };
  font: {
    family: string;
    size: string;
  };
}

export class ThemeService {
  private currentTheme: Theme;
  private themes: Record<Theme, ThemeConfig>;

  constructor(initialTheme: Theme = 'dark') {
    this.currentTheme = initialTheme;
    this.themes = this.initializeThemes();
    this.applyTheme(initialTheme);
  }

  private initializeThemes(): Record<Theme, ThemeConfig> {
    return {
      dark: {
        name: 'Escuro',
        colors: {
          background: '#323437',
          surface: '#2b2d2f',
          text: '#646669',
          textSecondary: '#d1d1d1',
          textCorrect: '#ffffff',
          textIncorrect: '#ca4754',
          textCursor: '#e2b714',
          accent: '#e2b714',
          border: '#3a3c3f',
        },
        font: {
          family: 'monospace',
          size: '1.5rem',
        },
      },
      light: {
        name: 'Claro',
        colors: {
          background: '#f5f5f5',
          surface: '#ffffff',
          text: '#9e9e9e',
          textSecondary: '#424242',
          textCorrect: '#212121',
          textIncorrect: '#d32f2f',
          textCursor: '#1976d2',
          accent: '#1976d2',
          border: '#e0e0e0',
        },
        font: {
          family: 'monospace',
          size: '1.5rem',
        },
      },
      monokai: {
        name: 'Monokai',
        colors: {
          background: '#272822',
          surface: '#1e1f1c',
          text: '#75715e',
          textSecondary: '#f8f8f2',
          textCorrect: '#f8f8f2',
          textIncorrect: '#f92672',
          textCursor: '#a6e22e',
          accent: '#a6e22e',
          border: '#49483e',
        },
        font: {
          family: 'monospace',
          size: '1.5rem',
        },
      },
      ocean: {
        name: 'Oceano',
        colors: {
          background: '#0a1929',
          surface: '#132f4c',
          text: '#5a7a9a',
          textSecondary: '#b2d4ff',
          textCorrect: '#e3f2fd',
          textIncorrect: '#ff6b6b',
          textCursor: '#4fc3f7',
          accent: '#4fc3f7',
          border: '#1e4976',
        },
        font: {
          family: 'monospace',
          size: '1.5rem',
        },
      },
      forest: {
        name: 'Floresta',
        colors: {
          background: '#1a1f1c',
          surface: '#252b28',
          text: '#6b7d6b',
          textSecondary: '#c8d5c8',
          textCorrect: '#e8f5e8',
          textIncorrect: '#ff6b6b',
          textCursor: '#81c784',
          accent: '#81c784',
          border: '#3a4a3a',
        },
        font: {
          family: 'monospace',
          size: '1.5rem',
        },
      },
    };
  }

  /**
   * Aplica um tema
   */
  applyTheme(theme: Theme): void {
    this.currentTheme = theme;
    const config = this.themes[theme];

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--theme-bg', config.colors.background);
      root.style.setProperty('--theme-surface', config.colors.surface);
      root.style.setProperty('--theme-text', config.colors.text);
      root.style.setProperty('--theme-text-secondary', config.colors.textSecondary);
      root.style.setProperty('--theme-text-correct', config.colors.textCorrect);
      root.style.setProperty('--theme-text-incorrect', config.colors.textIncorrect);
      root.style.setProperty('--theme-text-cursor', config.colors.textCursor);
      root.style.setProperty('--theme-accent', config.colors.accent);
      root.style.setProperty('--theme-border', config.colors.border);
      root.style.setProperty('--theme-font-family', config.font.family);
      root.style.setProperty('--theme-font-size', config.font.size);
    }
  }

  /**
   * Obtém o tema atual
   */
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Obtém a configuração do tema atual
   */
  getCurrentThemeConfig(): ThemeConfig {
    return this.themes[this.currentTheme];
  }

  /**
   * Obtém todos os temas disponíveis
   */
  getAvailableThemes(): Theme[] {
    return Object.keys(this.themes) as Theme[];
  }

  /**
   * Obtém a configuração de um tema específico
   */
  getThemeConfig(theme: Theme): ThemeConfig {
    return this.themes[theme];
  }
}

