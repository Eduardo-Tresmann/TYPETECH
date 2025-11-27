import { GameService } from '@/core/services/GameService';
import { validateTypingResult } from '@/utils/validation';
import { getSupabaseService, getSupabaseAnon } from '@/lib/supabaseAdmin';
import type { Difficulty, GameConfig } from '@/core/types';

export type TypingResultRequestBody = {
  userInput: string;
  targetText: string;
  totalTime: number;
  elapsedTime?: number;
  difficulty?: Difficulty;
};

export type TypingResultResponse = {
  data: {
    total_time: number;
    wpm: number;
    accuracy: number;
    correct_letters: number;
    incorrect_letters: number;
  };
};

export type TypingResultError = {
  error: string;
};

const ALLOWED_DURATIONS = new Set([15, 30, 60, 120]);
const MAX_PAYLOAD_LENGTH = 12000;

const createGameService = (duration: number, difficulty: Difficulty | undefined): GameService => {
  const config: GameConfig = {
    difficulty: difficulty ?? 'medium',
    duration,
    theme: 'dark',
    soundEnabled: false,
    typingSoundEnabled: false,
    interfaceSoundEnabled: false,
    typingVolume: 0,
    interfaceVolume: 0,
  };

  return new GameService(config);
};

export async function saveTypingResult(
  body: TypingResultRequestBody,
  accessToken: string
): Promise<{ success: true; data: TypingResultResponse['data'] } | { success: false; error: string; status: number }> {
  // Validar token
  if (!accessToken) {
    return { success: false, error: 'Token de acesso ausente.', status: 401 };
  }

  // Validar parâmetros obrigatórios
  if (
    typeof body.userInput !== 'string' ||
    typeof body.targetText !== 'string' ||
    typeof body.totalTime !== 'number'
  ) {
    return {
      success: false,
      error: 'Parâmetros obrigatórios ausentes ou inválidos.',
      status: 400,
    };
  }

  // Validar comprimento dos textos
  if (
    body.userInput.length === 0 ||
    body.userInput.length > MAX_PAYLOAD_LENGTH ||
    body.targetText.length === 0 ||
    body.targetText.length > MAX_PAYLOAD_LENGTH
  ) {
    return {
      success: false,
      error: 'Conteúdo de texto fora dos limites permitidos.',
      status: 400,
    };
  }

  // Validar duração
  if (!ALLOWED_DURATIONS.has(body.totalTime)) {
    return {
      success: false,
      error: 'Duração de teste inválida.',
      status: 400,
    };
  }

  // Validar tempo transcorrido
  const elapsedTime = typeof body.elapsedTime === 'number' ? body.elapsedTime : body.totalTime;
  if (elapsedTime <= 0 || elapsedTime > 300) {
    return {
      success: false,
      error: 'Tempo transcorrido inválido.',
      status: 400,
    };
  }

  try {
    // Validar token do usuário usando cliente anon
    let anonSupabase;
    try {
      anonSupabase = getSupabaseAnon();
    } catch (configError) {
      console.error('Erro ao inicializar Supabase Anon:', configError);
      return {
        success: false,
        error: 'Configuração do servidor inválida. Verifique as variáveis de ambiente.',
        status: 500,
      };
    }

    const { data: userData, error: userError } = await anonSupabase.auth.getUser(accessToken);

    if (userError || !userData?.user) {
      return {
        success: false,
        error: 'Sessão inválida ou expirada.',
        status: 401,
      };
    }

    // Calcular estatísticas
    const gameService = createGameService(body.totalTime, body.difficulty);
    const stats = gameService.calculateStats(body.userInput, body.targetText, elapsedTime);

    // Validar resultados
    const validation = validateTypingResult({
      total_time: body.totalTime,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      correct_letters: stats.correctLetters,
      incorrect_letters: stats.incorrectLetters,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        status: 400,
      };
    }

    // Obter cliente service role para inserir dados
    let serviceSupabase;
    try {
      serviceSupabase = getSupabaseService();
    } catch (configError) {
      console.error('Erro ao inicializar Supabase Service:', configError);
      return {
        success: false,
        error: 'Configuração do servidor inválida. Verifique SUPABASE_SERVICE_ROLE_KEY.',
        status: 500,
      };
    }

    // Salvar no banco usando service role
    const { error: insertError } = await serviceSupabase.from('typing_results').insert({
      user_id: userData.user.id,
      total_time: body.totalTime,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      correct_letters: stats.correctLetters,
      incorrect_letters: stats.incorrectLetters,
      verified: true,
    });

    if (insertError) {
      console.error('Falha ao salvar typing_results', insertError);
      return {
        success: false,
        error: 'Não foi possível salvar o resultado.',
        status: 500,
      };
    }

    // Retornar sucesso
    return {
      success: true,
      data: {
        total_time: body.totalTime,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        correct_letters: stats.correctLetters,
        incorrect_letters: stats.incorrectLetters,
      },
    };
  } catch (err) {
    console.error('Erro inesperado ao salvar typing_results', err);
    return {
      success: false,
      error: 'Erro interno.',
      status: 500,
    };
  }
}

