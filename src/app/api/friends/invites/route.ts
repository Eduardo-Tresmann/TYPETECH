import { NextResponse } from 'next/server';
import { validateAuth } from '@/api/utils/auth';
import { sendInvite } from '@/api/friends';
import { validateSendInviteRequest } from '@/api/dto/friends.dto';

export async function POST(request: Request) {
  try {
    // Validar autenticação
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parsear body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload inválido ou mal formatado.' }, { status: 400 });
    }

    // Validar DTO
    const validation = validateSendInviteRequest(body);
    if (!validation.valid || !validation.normalized) {
      return NextResponse.json({ error: validation.error || 'Dados inválidos' }, { status: 400 });
    }

    // Enviar convite
    const result = await sendInvite(authResult.userId, validation.normalized);

    if (result.success) {
      return NextResponse.json({ data: result.data }, { status: 201 });
    }

    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    console.error('Erro inesperado no route handler de send invite:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

