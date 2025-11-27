import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/api/utils/auth';
import { removeFriend } from '@/api/friends';
import { validateInviteId } from '@/api/dto/friends.dto';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar autenticação
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Validar ID do amigo
    const { id: friendId } = await params;
    const idValidation = validateInviteId(friendId);
    if (!idValidation.valid) {
      return NextResponse.json({ error: idValidation.error || 'ID inválido' }, { status: 400 });
    }

    // Remover amigo
    const result = await removeFriend(authResult.userId, friendId);

    if (result.success) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    console.error('Erro inesperado no route handler de remove friend:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

