'use client';
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-3 h-3 border-2',
    md: 'w-4 h-4 border-2',
    lg: 'w-6 h-6 border-2'
  };

  return (
    <div className={`${sizeClasses[size]} border-[#e2b714] border-t-transparent rounded-full animate-spin ${className}`}></div>
  );
}

