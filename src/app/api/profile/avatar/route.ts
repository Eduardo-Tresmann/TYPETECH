import { NextResponse } from 'next/server';
import { validateAuth } from '@/api/utils/auth';
import { uploadAvatar } from '@/api/profile';

export async function POST(request: Request) {
  try {
    // Validar autenticação
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Parsear FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'FormData inválido.' }, { status: 400 });
    }

    // Obter arquivo
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo não fornecido ou inválido.' }, { status: 400 });
    }

    // Fazer upload
    const result = await uploadAvatar(authResult.userId, file);

    if (result.success) {
      return NextResponse.json({ data: { url: result.url } }, { status: 200 });
    }

    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    console.error('Erro inesperado no route handler de avatar:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

