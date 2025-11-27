import { NextResponse } from 'next/server';
import { saveTypingResult } from '@/api/typingResults';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de acesso ausente.' }, { status: 401 });
    }

    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return NextResponse.json({ error: 'Token de acesso inválido.' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      console.error('Erro ao parsear JSON:', err);
      return NextResponse.json({ error: 'Payload inválido ou mal formatado.' }, { status: 400 });
    }

    const result = await saveTypingResult(body, accessToken);

    if (result.success) {
      return NextResponse.json({ data: result.data }, { status: 201 });
    }

    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    console.error('Erro inesperado no route handler:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

