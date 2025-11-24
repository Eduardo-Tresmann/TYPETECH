/**
 * Serviço de feedback sonoro
 * Gerencia sons para acertos e erros
 */

export class SoundService {
  private enabled: boolean;
  private audioContext: AudioContext | null = null;
  private correctSound: OscillatorNode | null = null;
  private incorrectSound: OscillatorNode | null = null;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.initializeAudioContext();
  }

  private initializeAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (error) {
        console.warn('AudioContext não disponível:', error);
      }
    }
  }

  /**
   * Toca som de acerto
   */
  playCorrect(): void {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = 800; // Tom agudo para acerto
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Erro ao tocar som de acerto:', error);
    }
  }

  /**
   * Toca som de erro
   */
  playIncorrect(): void {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = 200; // Tom grave para erro
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.15);
    } catch (error) {
      console.warn('Erro ao tocar som de erro:', error);
    }
  }

  /**
   * Habilita ou desabilita sons
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Verifica se os sons estão habilitados
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
