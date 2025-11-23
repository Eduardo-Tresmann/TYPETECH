'use client';
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingStateProps {
  loading: boolean;
  empty?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  emptySubtitle?: string;
  loadingMessage?: string;
  children: React.ReactNode;
}

export default function LoadingState({
  loading,
  empty = false,
  emptyMessage = 'Nenhum item encontrado',
  emptyIcon = '📭',
  emptySubtitle,
  loadingMessage,
  children
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <LoadingSpinner />
        {loadingMessage && (
          <span className="text-[#d1d1d1] text-sm">{loadingMessage}</span>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="text-[#d1d1d1] text-center py-12">
        {emptyIcon && <div className="text-4xl mb-3">{emptyIcon}</div>}
        <div className="text-lg font-medium mb-1">{emptyMessage}</div>
        {emptySubtitle && (
          <div className="text-sm text-[#6b6e70]">{emptySubtitle}</div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

