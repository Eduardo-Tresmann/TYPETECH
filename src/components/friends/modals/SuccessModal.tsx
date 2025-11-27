'use client';

import React, { useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/hooks/useSound';

type SuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
};

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  autoClose = true,
  autoCloseDelay = 3000,
}: SuccessModalProps) {
  const { playClick } = useSound();

  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" showCloseButton={!autoClose}>
      <div className="flex flex-col items-center text-center">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-[#d1d1d1] mb-6">{message}</p>
        {!autoClose && (
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="w-full px-4 py-2 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-colors font-medium"
          >
            Fechar
          </button>
        )}
      </div>
    </Modal>
  );
}

