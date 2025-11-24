'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Message = { 
  id: number; 
  pair_key: string; 
  sender_id: string; 
  recipient_id: string; 
  content: string; 
  created_at: string;
};

type Friend = { 
  id: string; 
  display_name: string | null; 
  avatar_url: string | null;
};

type ChatWindowProps = {
  friend: Friend;
  currentUserId: string;
  messages: Message[];
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onClose: () => void;
  isOpen: boolean;
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatMessageDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString();
  
  if (isToday) {
    return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (isYesterday) {
    return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit', 
    minute: '2-digit'
  });
};

const shouldShowDateSeparator = (currentMsg: Message, previousMsg: Message | null): boolean => {
  if (!previousMsg) return true;
  const currentDate = new Date(currentMsg.created_at).toDateString();
  const previousDate = new Date(previousMsg.created_at).toDateString();
  return currentDate !== previousDate;
};

const shouldShowAvatar = (currentMsg: Message, previousMsg: Message | null, isOwn: boolean): boolean => {
  if (isOwn) return false;
  if (!previousMsg) return true;
  if (previousMsg.sender_id !== currentMsg.sender_id) return true;
  const timeDiff = new Date(currentMsg.created_at).getTime() - new Date(previousMsg.created_at).getTime();
  return timeDiff > 300000; // 5 minutos
};

export default function ChatWindow({
  friend,
  currentUserId,
  messages,
  messageText,
  onMessageChange,
  onSendMessage,
  onClose,
  isOpen
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Pequeno delay para garantir que o DOM foi atualizado
      const timer = setTimeout(() => {
        try {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageText.trim()) {
        onSendMessage();
      }
    }
  };

  if (!isOpen) return null;

  const initials = (friend.display_name ?? 'US').slice(0, 2).toUpperCase();
  const displayNameTruncated = (friend.display_name ?? 'amigo').length > 20 
    ? (friend.display_name ?? 'amigo').slice(0, 17) + '...' 
    : (friend.display_name ?? 'amigo');

  return (
    <>
      {/* Overlay para mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Chat Window */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[420px] bg-[#2b2d2f] z-50 flex flex-col shadow-2xl md:shadow-none transform transition-transform duration-300 ease-in-out border-l border-[#3a3c3f]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3a3c3f] bg-[#1f2022]">
          <div className="relative flex-1 min-w-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition-all px-2 py-1.5 rounded-lg hover:bg-[#2b2d2f]/50"
            >
              {friend.avatar_url ? (
                <Image 
                  src={friend.avatar_url} 
                  alt="Avatar" 
                  width={44} 
                  height={44} 
                  className="rounded-full object-cover flex-shrink-0 cursor-pointer border-2 border-[#e2b714]/30" 
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold flex-shrink-0 cursor-pointer border-2 border-[#e2b714]">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white truncate text-sm">{friend.display_name ?? 'Usuário'}</div>
                <div className="text-xs text-[#d1d1d1] flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Online
                </div>
              </div>
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-2 z-50">
                <div className="w-56 bg-[#2b2d2f] text-white rounded-xl shadow-xl p-2 space-y-1 border border-[#3a3c3f]">
                  <Link 
                    href={`/stats/${encodeURIComponent(friend.id)}`}
                    onClick={() => {
                      setMenuOpen(false);
                      try {
                        if (typeof window !== 'undefined') {
                          localStorage.setItem(`profile.cache.${friend.id}`, JSON.stringify({ 
                            display_name: friend.display_name, 
                            avatar_url: friend.avatar_url 
                          }));
                        }
                      } catch {}
                    }}
                    className="flex items-center gap-2.5 text-[#d1d1d1] hover:text-white hover:bg-[#1f2022] px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 20V10M10 20V6M16 20V13M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Ver Estatísticas
                  </Link>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-2 rounded-lg hover:bg-[#3a3c3f] transition-colors text-[#d1d1d1] hover:text-white"
            aria-label="Fechar chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-[#2b2d2f] p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#6b6e70]">
              <div className="text-center">
                <div className="text-base mb-2 font-medium">Nenhuma mensagem ainda</div>
                <div className="text-sm">Comece a conversar com {friend.display_name ?? 'seu amigo'}!</div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.sender_id === currentUserId;
              const previousMsg = idx > 0 ? messages[idx - 1] : null;
              const showDateSeparator = shouldShowDateSeparator(msg, previousMsg);
              const showAvatar = shouldShowAvatar(msg, previousMsg, isOwn);

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="text-xs text-[#6b6e70] bg-[#1f2022] px-3 py-1.5 rounded-full border border-[#3a3c3f]">
                        {formatMessageDate(msg.created_at)}
                      </div>
                    </div>
                  )}
                  <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {showAvatar && !isOwn && (
                      <div className="flex-shrink-0">
                        {friend.avatar_url ? (
                          <Image 
                            src={friend.avatar_url} 
                            alt="Avatar" 
                            width={40} 
                            height={40} 
                            className="rounded-full object-cover border-2 border-[#e2b714]/30" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold border-2 border-[#e2b714]">
                            {initials}
                          </div>
                        )}
                      </div>
                    )}
                    {!showAvatar && !isOwn && <div className="w-10" />}
                    <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {showAvatar && !isOwn && (
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-white">{friend.display_name ?? 'Usuário'}</span>
                          <span className="text-xs text-[#6b6e70]">{formatTime(msg.created_at)}</span>
                        </div>
                      )}
                      {!showAvatar && !isOwn && (
                        <span className="text-xs text-[#6b6e70] mb-1 ml-1">{formatTime(msg.created_at)}</span>
                      )}
                      <div
                        className={`rounded-xl px-4 py-2.5 break-words shadow-sm ${
                          isOwn
                            ? 'bg-[#e2b714] text-black rounded-br-sm'
                            : 'bg-[#1f2022] text-white rounded-bl-sm border border-[#3a3c3f]'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content.split('\n').map((line, i, arr) => (
                            <React.Fragment key={i}>
                              {line}
                              {i < arr.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                    {isOwn && <div className="w-10" />}
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#3a3c3f] bg-[#1f2022]">
          <div className="flex gap-2.5 items-end">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Mensagem para ${displayNameTruncated}...`}
              className="flex-1 min-h-[44px] max-h-[120px] px-4 py-3 rounded-lg bg-[#2b2d2f] text-white placeholder-[#6b6e70] outline-none border border-[#3a3c3f] focus:border-[#e2b714] focus:ring-2 focus:ring-[#e2b714]/20 transition-all resize-none text-sm"
              rows={1}
              style={{
                height: 'auto',
                overflow: 'auto'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={onSendMessage}
              disabled={!messageText.trim()}
              className="p-3 rounded-lg bg-[#e2b714] text-black hover:bg-[#d4c013] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-lg hover:shadow-xl disabled:shadow-none"
              aria-label="Enviar mensagem"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="text-xs text-[#6b6e70] mt-2 text-center">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </div>
        </div>
      </div>
    </>
  );
}

