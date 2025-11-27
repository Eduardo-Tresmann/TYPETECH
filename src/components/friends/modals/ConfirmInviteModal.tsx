'use client';

import React from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { getInitials } from '@/utils/avatar';
import { useSound } from '@/hooks/useSound';

type ConfirmInviteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userAvatar?: string | null;
  action: 'accept' | 'reject';
  onConfirm: () => void;
};

export default function ConfirmInviteModal({
  isOpen,
  onClose,
  userName,
  userAvatar,
  action,
  onConfirm,
}: ConfirmInviteModalProps) {
  const { playClick } = useSound();

  const isAccept = action === 'accept';
  const title = isAccept ? 'Aceitar convite' : 'Recusar convite';
  const message = isAccept
    ? `Deseja aceitar o convite de amizade de ${userName}?`
    : `Deseja recusar o convite de amizade de ${userName}?`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
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
        <p className="text-[#d1d1d1] mb-6">
          {message}
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="flex-1 px-4 py-2 rounded-lg bg-[#3a3c3f] text-white hover:bg-[#4a4c4f] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              playClick();
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
              isAccept
                ? 'bg-[#e2b714] text-black hover:bg-[#d4c013]'
                : 'bg-[#ca4754] text-white hover:bg-[#d95562]'
            }`}
          >
            {isAccept ? 'Aceitar' : 'Recusar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

