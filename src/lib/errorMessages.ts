export const translateError = (err: any): string => {
  const raw = err?.message ?? '';
  const msg = raw.toLowerCase();
  const status = err?.status ?? err?.code ?? null;
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed') || msg.includes('not confirmed'))
    return 'E-mail não confirmado.';
  if (msg.includes('email address') && msg.includes('invalid'))
    return 'E-mail inválido. Use formato nome@dominio.tld.';
  if (msg.includes('user already registered')) return 'E-mail já cadastrado.';
  if (msg.includes('password should be at least')) return 'A senha deve ter ao menos 6 caracteres.';
  if (msg.includes('weak password')) return 'Senha fraca. Use uma senha mais forte.';
  if (msg.includes('signups not allowed') || msg.includes('signup not allowed'))
    return 'Cadastro desativado.';
  if (msg.includes('too many requests') || msg.includes('rate limit') || status === 429)
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (msg.includes('invalid token') || msg.includes('token expired') || msg.includes('expired'))
    return 'Link inválido ou expirado.';
  if (msg.includes('duplicate key value') || msg.includes('unique constraint'))
    return 'Este nome de perfil já está em uso.';
  if (status && Number(status) >= 500) return 'Erro no servidor. Tente novamente mais tarde.';
  return raw || 'Não foi possível completar a operação.';
};
