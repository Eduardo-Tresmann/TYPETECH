import { NextResponse } from 'next/server';
import { validateAuth } from '@/api/utils/auth';
import { searchUsersMultiStrategy } from '@/api/userSearch';
import { validateSearchUsersRequest } from '@/api/dto/userSearch.dto';

export async function GET(request: Request) {
  try {
    // Validar autenticação (busca requer usuário autenticado)
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parsear query string
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');

    // Construir objeto de requisição
    const requestData = {
      query,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    };

    // Validar DTO
    const validation = validateSearchUsersRequest(requestData);
    if (!validation.valid || !validation.normalized) {
      return NextResponse.json({ error: validation.error || 'Dados inválidos' }, { status: 400 });
    }

    // Buscar usuários
    const result = await searchUsersMultiStrategy(validation.normalized);

    if (result.success) {
      return NextResponse.json({ data: result.data }, { status: 200 });
    }

    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    console.error('Erro inesperado no route handler de search:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

