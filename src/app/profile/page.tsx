'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { translateError } from '@/lib/errorMessages';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ImageCropperModal from '@/components/ImageCropperModal';
import ProfileForm from '@/components/profile/ProfileForm';
import {
  fetchProfile,
  createInitialProfile,
  validateDisplayName,
  isDisplayNameTaken,
  updateProfile,
  type Profile,
} from '@/services/ProfileService';
import { uploadAvatar, validateAvatarUrl } from '@/services/AvatarService';
import { getCachedDisplayName, getCachedAvatarUrl, setCachedProfile } from '@/utils/storage';

const AVATARS_BUCKET = process.env.NEXT_PUBLIC_AVATARS_BUCKET ?? 'avatars';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile>(() => ({
    display_name: getCachedDisplayName(),
    avatar_url: getCachedAvatarUrl(),
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
        const data = await fetchProfile(supabase, user.id);
        if (!data) {
          const initial = await createInitialProfile(supabase, user.id, defaultName);
          setProfile(initial);
          setCachedProfile(initial.display_name, initial.avatar_url);
        } else {
          const profileData = {
            display_name: data.display_name ?? defaultName,
            avatar_url: data.avatar_url ?? null,
          };
          setProfile(profileData);
          setCachedProfile(profileData.display_name, profileData.avatar_url);
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

      // Validação do nome de exibição
      const validation = validateDisplayName(candidateRaw);
      if (!validation.valid || !validation.normalized) {
        setError(validation.error || 'Nome inválido');
        setSaving(false);
        return;
      }

      const candidate = validation.normalized;

      // Verificar se o nome já está em uso
      const taken = await isDisplayNameTaken(supabase, candidate, user.id);
      if (taken) {
        setError('Este nome de perfil já está em uso.');
        setSaving(false);
        return;
      }

      // Processar avatar
      let avatarUrl = profile.avatar_url ?? null;

      if (avatarFile) {
        const uploadResult = await uploadAvatar(supabase, user.id, avatarFile, AVATARS_BUCKET);

        if (!uploadResult.success) {
          setError(uploadResult.error || 'Erro ao fazer upload do avatar');
          setSaving(false);
          return;
        }

        if (uploadResult.error) {
          // Aviso sobre bucket não encontrado, mas upload funcionou
          setInfo(uploadResult.error);
        }

        avatarUrl = uploadResult.url || null;
      }

      // Validar URL de avatar se já existir
      if (avatarUrl) {
        const urlValidation = validateAvatarUrl(avatarUrl);
        if (!urlValidation.valid) {
          setError(urlValidation.error || 'URL de avatar inválida');
          setSaving(false);
          return;
        }
      }

      // Atualizar perfil
      await updateProfile(supabase, user.id, candidate, avatarUrl);

      setInfo('Perfil atualizado com sucesso.');
      setAvatarFile(null);
      setProfile({
        display_name: candidate,
        avatar_url: avatarUrl,
      });
      setCachedProfile(candidate, avatarUrl);

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

  const handleAvatarFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#323437] flex items-center justify-center px-6">
        <div className="text-white text-xl">
          Você precisa estar logado para acessar o perfil.{' '}
          <Link href="/auth/login" className="text-[#e2b714]">
            Entrar
          </Link>
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

        <ProfileForm
          displayName={profile.display_name}
          defaultName={defaultName}
          email={user.email as string}
          avatarUrl={profile.avatar_url}
          avatarFile={avatarFile}
          onDisplayNameChange={name => setProfile(p => ({ ...p, display_name: name }))}
          onAvatarFileSelect={handleAvatarFileSelect}
          onSave={handleSave}
          onSignOut={handleSignOut}
          saving={saving}
          loading={loading}
          error={error}
          info={info}
        />
      </div>

      {showCropper && imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onClose={() => {
            setShowCropper(false);
            setImageToCrop(null);
          }}
          onCropComplete={croppedBlob => {
            const file = new File([croppedBlob], 'avatar.jpg', {
              type: 'image/jpeg',
            });
            setAvatarFile(file);
            setShowCropper(false);
            setImageToCrop(null);
          }}
        />
      )}
    </div>
  );
}
