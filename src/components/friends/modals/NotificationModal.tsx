'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { getInitials } from '@/utils/avatar';
import { useSound } from '@/hooks/useSound';

type NotificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userAvatar?: string | null;
  message: string;
  onAction?: () => void;
  actionLabel?: string;
  type?: 'info' | 'success' | 'warning';
};

export default function NotificationModal({
  isOpen,
  onClose,
  userName,
  userAvatar,
  message,
  onAction,
  actionLabel,
  type = 'info',
}: NotificationModalProps) {
  const { playClick } = useSound();

  // Fechar automaticamente após 3 segundos
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const iconColors = {
    info: 'text-[#e2b714]',
    success: 'text-green-400',
    warning: 'text-yellow-400',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notificação" size="md">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          {userAvatar ? (
            <Image
              src={userAvatar}
              alt={userName}
              width={64}
              height={64}
              className="rounded-full object-cover mx-auto"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-xl font-semibold mx-auto">
              {getInitials(userName)}
            </div>
          )}
        </div>
        <div className={`text-4xl mb-3 ${iconColors[type]}`}>
          {type === 'info' && '🔔'}
          {type === 'success' && '✅'}
          {type === 'warning' && '⚠️'}
        </div>
        <p className="text-[#d1d1d1] mb-6">
          <span className="font-semibold text-white">{userName}</span> {message}
        </p>
        {onAction && actionLabel && (
          <button
            onClick={() => {
              playClick();
              onAction();
              onClose();
            }}
            className="w-full px-4 py-2 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors font-medium"
          >
            {actionLabel}
          </button>
        )}
        {!onAction && (
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="w-full px-4 py-2 rounded-lg bg-[#3a3c3f] text-white hover:bg-[#4a4c4f] transition-colors"
          >
            Fechar
          </button>
        )}
      </div>
    </Modal>
  );
}

