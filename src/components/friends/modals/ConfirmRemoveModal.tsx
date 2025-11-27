'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/hooks/useSound';

type ConfirmRemoveModalProps = {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  onConfirm: () => void;
};

export default function ConfirmRemoveModal({
  isOpen,
  onClose,
  friendName,
  onConfirm,
}: ConfirmRemoveModalProps) {
  const { playClick } = useSound();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Remover amigo" size="md">
      <p className="text-[#d1d1d1] mb-6">
        Tem certeza que deseja remover <span className="font-semibold text-white">{friendName}</span> da sua lista de amigos?
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          className="px-4 py-2 rounded-lg bg-[#3a3c3f] text-white hover:bg-[#4a4c4f] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            playClick();
            onConfirm();
          }}
          className="px-4 py-2 rounded-lg bg-[#ca4754] text-white hover:bg-[#d95562] transition-colors font-medium"
        >
          Remover
        </button>
      </div>
    </Modal>
  );
}

