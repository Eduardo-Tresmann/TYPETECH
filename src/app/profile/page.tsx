"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ImageCropperModal from '@/components/ImageCropperModal';

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const AVATARS_BUCKET = process.env.NEXT_PUBLIC_AVATARS_BUCKET ?? 'avatars';
  const [profile, setProfile] = useState<Profile>(() => ({
    display_name: typeof window !== 'undefined' ? localStorage.getItem('profile.display_name') : null,
    avatar_url: typeof window !== 'undefined' ? localStorage.getItem('profile.avatar_url') : null,
  }));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const defaultName = useMemo(() => {
    const email = user?.email as string | undefined;
    return email ? email.split('@')[0] : '';
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        if (!user) return;
        if (!hasSupabaseConfig()) throw new Error('Supabase não configurado.');
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          const initial = {
            id: user.id,
            display_name: defaultName,
            avatar_url: null,
            updated_at: new Date().toISOString(),
          } as any;
          const { error: upsertError } = await supabase.from('profiles').upsert(initial, { onConflict: 'id' });
          if (upsertError) {
            // Mantém estado padrão e mostra informação amigável
            setProfile({ display_name: defaultName, avatar_url: null });
            setInfo('Perfil inicial não pôde ser criado. Verifique a tabela public.profiles e políticas RLS.');
          } else {
            setProfile({ display_name: defaultName, avatar_url: null });
          }
        } else {
          setProfile({
            display_name: data.display_name ?? defaultName,
            avatar_url: data.avatar_url ?? null,
          });
        }
      } catch (err: any) {
        setError(translateError(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, defaultName]);

  

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      if (!user) throw new Error('Usuário não autenticado.');
      if (!hasSupabaseConfig()) throw new Error('Supabase não configurado.');
      
      // Rate limiting
      const { rateLimiters } = await import('@/utils/security');
      if (!rateLimiters.updateProfile.check()) {
        const timeLeft = Math.ceil(rateLimiters.updateProfile.getTimeUntilReset() / 1000 / 60);
        setError(`Muitas atualizações. Aguarde ${timeLeft} minuto(s) antes de tentar novamente.`);
        setSaving(false);
        return;
      }
      
      const supabase = getSupabase();
      const candidateRaw = profile.display_name ?? defaultName ?? '';
      
      // Validação usando utilitário
      const { isValidDisplayName, normalizeDisplayName } = await import('@/utils/validation');
      const candidate = normalizeDisplayName(candidateRaw);
      
      if (!isValidDisplayName(candidate)) {
        setError('O nome do perfil deve ter entre 3 e 24 caracteres e conter apenas letras, números, espaços e alguns caracteres especiais.');
        setSaving(false);
        return;
      }
      const { count, error: findError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .neq('id', user.id)
        .ilike('display_name', candidate);
      if (findError) throw findError;
      const hasDup = (count ?? 0) > 0;
      if (hasDup) {
        setError('Este nome de perfil já está em uso.');
        return;
      }

      let avatarUrl = profile.avatar_url ?? null;
      const fileToDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      if (avatarFile) {
        // Validação de arquivo
        const { isValidImageMimeType, isValidFileSize, sanitizeFileName } = await import('@/utils/security');
        
        if (!isValidImageMimeType(avatarFile.type)) {
          setError('Tipo de arquivo inválido. Use apenas imagens (JPEG, PNG, GIF, WebP).');
          setSaving(false);
          return;
        }
        
        if (!isValidFileSize(avatarFile.size, 5)) {
          setError('Arquivo muito grande. O tamanho máximo é 5MB.');
          setSaving(false);
          return;
        }
        
        const sanitizedName = sanitizeFileName(avatarFile.name);
        const path = `${user.id}/${Date.now()}-${sanitizedName}`;
        const storage = supabase.storage.from(AVATARS_BUCKET);
        const { error: uploadError } = await storage.upload(path, avatarFile, { upsert: true });
        if (uploadError) {
          const msg = (uploadError.message ?? '').toLowerCase();
          if (msg.includes('bucket not found')) {
            // fallback: salvar como data URL para exibir mesmo sem bucket
            try {
              avatarUrl = await fileToDataUrl(avatarFile);
              setInfo(`Bucket "${AVATARS_BUCKET}" não encontrado. A imagem foi salva inline temporariamente. Recomenda-se criar o bucket público para melhor desempenho.`);
            } catch (e) {
              setInfo(`Bucket de avatares não encontrado. Crie o bucket "${AVATARS_BUCKET}" em Storage e defina como público.`);
            }
          } else {
            setError(uploadError.message ?? 'Erro ao enviar avatar');
          }
        } else {
          const { data: pub } = storage.getPublicUrl(path);
          const { isValidAvatarUrl } = await import('@/utils/validation');
          const url = pub.publicUrl;
          if (!isValidAvatarUrl(url)) {
            setError('URL de avatar inválida. Use apenas HTTPS de domínios confiáveis.');
            setSaving(false);
            return;
          }
          avatarUrl = url;
        }
      }
      
      // Validar URL de avatar se já existir
      if (avatarUrl) {
        const { isValidAvatarUrl } = await import('@/utils/validation');
        if (!isValidAvatarUrl(avatarUrl)) {
          setError('URL de avatar inválida. Use apenas HTTPS de domínios confiáveis.');
          setSaving(false);
          return;
        }
      }

      const toSave = {
        id: user.id,
        display_name: candidate,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from('profiles').upsert(toSave, { onConflict: 'id' });
      if (upsertError) throw upsertError;
      setInfo('Perfil atualizado com sucesso.');
      setAvatarFile(null);
      setProfile((p) => ({ ...p, display_name: toSave.display_name ?? p.display_name, avatar_url: avatarUrl ?? p.avatar_url }));
      if (typeof window !== 'undefined') {
        if (toSave.display_name) localStorage.setItem('profile.display_name', toSave.display_name);
        if (avatarUrl) localStorage.setItem('profile.avatar_url', avatarUrl);
      }
      setTimeout(() => {
        window.location.href = '/home';
      }, 3000);
    } catch (err: any) {
      setError(translateError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/home';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#323437] flex items-center justify-center px-6">
        <div className="text-white text-xl">
          Você precisa estar logado para acessar o perfil.{' '}
          <Link href="/auth/login" className="text-[#e2b714]">Entrar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#323437] flex items-center justify-center px-6 py-4">
      <div className="w-full max-w-4xl">
        {/* Header compacto */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-2xl font-bold">Perfil</h1>
            <Link 
              href="/home" 
              className="text-[#d1d1d1] hover:text-white text-sm transition-colors"
            >
              ← Voltar
            </Link>
          </div>
        </div>

        <div className="bg-[#2b2d2f] rounded-xl border border-[#3a3c3f] p-6 text-white shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna esquerda - Avatar */}
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <div className="relative mb-4">
                {profile.avatar_url || avatarFile ? (
                  <img 
                    src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatar_url!} 
                    alt="avatar" 
                    className="w-28 h-28 rounded-full object-cover border-4 border-[#e2b714] shadow-lg mx-auto" 
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-3xl font-bold border-4 border-[#e2b714] shadow-lg mx-auto">
                    {(profile.display_name ?? defaultName ?? 'US').slice(0,2).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-lg font-semibold mb-2 text-center w-full">
                {profile.display_name || defaultName || 'Usuário'}
              </h2>
              <p className="text-[#d1d1d1] text-xs text-center break-words w-full px-2">{user.email}</p>
            </div>

            {/* Coluna direita - Formulário */}
            <div className="md:col-span-2 space-y-4">
              {/* Email (somente leitura) */}
              <div>
                <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
                  E-mail
                </label>
                <div className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white border border-[#3a3c3f] opacity-75 cursor-not-allowed text-sm">
                  {user.email}
                </div>
              </div>

              {/* Nome de exibição */}
              <div>
                <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
                  Nome de exibição
                </label>
                <input
                  type="text"
                  value={profile.display_name ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all text-sm"
                  maxLength={24}
                  placeholder={defaultName}
                />
                <p className="text-[#6b6e70] text-xs mt-1">
                  {profile.display_name?.length || 0}/24
                </p>
              </div>

              {/* Foto de perfil */}
              <div>
                <label className="block text-[#d1d1d1] text-sm font-medium mb-1.5">
                  Foto de perfil
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setImageToCrop(reader.result as string);
                          setShowCropper(true);
                        };
                        reader.readAsDataURL(f);
                      }
                    }}
                    className="w-full p-3.5 rounded-lg bg-[#1f2022] text-white outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e2b714] file:text-black file:cursor-pointer hover:file:bg-[#d4c013] file:transition-colors text-sm"
                  />
                </div>
                {avatarFile && (
                  <div className="mt-2.5 p-2.5 bg-[#1f2022] rounded-lg border border-[#3a3c3f] flex items-center gap-2.5">
                    <img 
                      src={URL.createObjectURL(avatarFile)} 
                      alt="preview" 
                      className="w-14 h-14 rounded-full object-cover border-2 border-[#e2b714]" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">Nova foto selecionada</p>
                      <p className="text-xs text-[#d1d1d1] truncate">Clique em Salvar para aplicar</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mensagens de erro/sucesso */}
              {(error || info) && (
                <div>
                  {error && (
                    <div className="p-3.5 bg-[#ca4754]/10 border border-[#ca4754]/30 rounded-lg text-[#ca4754] text-sm flex items-center gap-2.5">
                      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="break-words">{error}</span>
                    </div>
                  )}
                  {!error && info && (
                    <div className="p-3.5 bg-[#e2b714]/10 border border-[#e2b714]/30 rounded-lg text-[#e2b714] text-sm flex items-center gap-2.5">
                      <svg className="w-4.5 h-4.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="break-words">{info}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Botão de salvar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3a3c3f] mt-2">
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2 text-sm text-[#d1d1d1] hover:text-white transition-colors"
                >
                  Sair
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={saving || loading} 
                  className="px-6 py-2.5 bg-[#e2b714] text-black rounded-lg hover:bg-[#d4c013] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl disabled:shadow-none text-sm"
                >
                  {(saving || loading) && <LoadingSpinner size="sm" className="border-black border-t-transparent" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCropper && imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onClose={() => {
            setShowCropper(false);
            setImageToCrop(null);
          }}
          onCropComplete={(croppedBlob) => {
            const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
            setAvatarFile(file);
            setShowCropper(false);
            setImageToCrop(null);
          }}
        />
      )}
    </div>
  );
}
