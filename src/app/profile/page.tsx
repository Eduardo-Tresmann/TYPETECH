"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';
import Link from 'next/link';

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
      const supabase = getSupabase();

      let avatarUrl = profile.avatar_url ?? null;
      const fileToDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      if (avatarFile) {
        const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
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
          avatarUrl = pub.publicUrl;
        }
      }

      const toSave = {
        id: user.id,
        display_name: profile.display_name ?? defaultName,
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
    <div className="min-h-[calc(100vh-56px)] bg-[#323437] flex items-center justify-center px-6">
      <div className="w-full max-w-[70ch]">
        <h1 className="text-white text-3xl font-bold mb-6">Perfil</h1>
        <div className="bg-[#2c2e31] rounded p-6 text-white space-y-4">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-xl font-semibold">
                {(profile.display_name ?? defaultName ?? 'US').slice(0,2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm text-[#d1d1d1]">E-mail</div>
              <div className="text-lg">{user.email}</div>
            </div>
          </div>

          <div>
            <label className="block text-[#d1d1d1] mb-1">Nome de exibição</label>
            <input
              type="text"
              value={profile.display_name ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
              className="w-full p-3 rounded bg-[#1f2022] text-white outline-none"
              placeholder={defaultName}
            />
          </div>



          <div>
            <label className="block text-[#d1d1d1] mb-1">Foto de perfil</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAvatarFile(f);
              }}
              className="w-full p-3 rounded bg-[#1f2022] text-white outline-none"
            />
            {avatarFile && (
              <div className="mt-2">
                <img src={URL.createObjectURL(avatarFile)} alt="preview" className="w-20 h-20 rounded-full object-cover" />
              </div>
            )}
          </div>

          <div className="min-h-[1.5rem]">
            {error && <div className="text-[#ca4754]">{error}</div>}
            {!error && info && <div className="text-[#e2b714]">{info}</div>}
          </div>

          <div className="flex items-center justify-center w-full">
            <button onClick={handleSave} disabled={saving || loading} className="py-2 px-6 text-lg bg-[#e2b714] text-black rounded hover:bg-[#d4c013] transition-colors">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}