'use client';
import React from 'react';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#323437] flex items-center justify-center px-6">
      <AuthForm mode="login" />
    </div>
  );
}