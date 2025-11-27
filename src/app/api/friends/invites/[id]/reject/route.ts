import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/api/utils/auth';
import { rejectInvite } from '@/api/friends';
import { validateInviteId } from '@/api/dto/friends.dto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar autenticação
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Validar ID do convite
    const { id: requestId } = await params;
    const idValidation = validateInviteId(requestId);
    if (!idValidation.valid) {
      return NextResponse.json({ error: idValidation.error || 'ID inválido' }, { status: 400 });
    }

    // Rejeitar convite
    const result = await rejectInvite(authResult.userId, requestId);

    if (result.success) {
      return NextResponse.json({}, { status: 200 });
    }

    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    console.error('Erro inesperado no route handler de reject invite:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

