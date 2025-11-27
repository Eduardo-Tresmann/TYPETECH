'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type Friend } from '@/services/FriendService';
import { getInitials } from '@/utils/avatar';
import { setCachedProfileForUser } from '@/utils/storage';
import { useSound } from '@/hooks/useSound';

type Message = {
  id: number;
  pair_key: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};

type FriendsMainAreaProps = {
  selectedFriend: Friend | null;
  currentUserId: string;
  messages: Message[];
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onOpenSidebar?: () => void;
  sidebarOpen?: boolean;
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}m`;
  
  const hours = Math.floor(diffMins / 60);
  if (hours < 24) return `${hours}h`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days}d`;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

export default function FriendsMainArea({
  selectedFriend,
  currentUserId,
  messages,
  messageText,
  onMessageChange,
  onSendMessage,
  onKeyDown,
  onOpenSidebar,
  sidebarOpen = false,
}: FriendsMainAreaProps) {
  const { playClick } = useSound();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastFriendIdRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Função para scroll direto ao final (sem animação) com retry
  const scrollToBottomInstant = () => {
    const container = messagesContainerRef.current;
    if (container) {
      // Forçar scroll para o final de forma instantânea
      container.scrollTop = container.scrollHeight;
    }
  };

  // Detectar mudança de amigo
  useEffect(() => {
    if (!selectedFriend) {
      lastFriendIdRef.current = null;
      lastMessageCountRef.current = 0;
      isInitialLoadRef.current = true;
      return;
    }

    const friendChanged = selectedFriend.id !== lastFriendIdRef.current;
    if (friendChanged) {
      lastFriendIdRef.current = selectedFriend.id;
      lastMessageCountRef.current = 0;
      isInitialLoadRef.current = true;
    }
  }, [selectedFriend?.id]);

  // useLayoutEffect executa antes da renderização visível - perfeito para scroll instantâneo
  useLayoutEffect(() => {
    if (!selectedFriend || messages.length === 0) {
      return;
    }

    // Scroll instantâneo na primeira carga das mensagens (ao abrir o chat)
    if (isInitialLoadRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        // Forçar scroll imediatamente ANTES da renderização visível
        container.scrollTop = container.scrollHeight;
        
        // Garantir múltiplas tentativas para capturar qualquer mudança no layout
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
            requestAnimationFrame(() => {
              container.scrollTop = container.scrollHeight;
            });
          });
        });
      }
      
      isInitialLoadRef.current = false;
      lastMessageCountRef.current = messages.length;
      return;
    }
  }, [messages, selectedFriend?.id]);

  // Atualizar contador após primeira renderização
  useEffect(() => {
    if (!selectedFriend || messages.length === 0) {
      return;
    }

    const isNewMessage = messages.length > lastMessageCountRef.current;
    if (isNewMessage && !isInitialLoadRef.current) {
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, selectedFriend?.id]);

  // Scroll suave apenas para novas mensagens durante a conversa (depois da primeira carga)
  useEffect(() => {
    if (!selectedFriend || messages.length === 0 || isInitialLoadRef.current) {
      return;
    }

    const isNewMessage = messages.length > lastMessageCountRef.current;
    if (isNewMessage) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, selectedFriend?.id]);

  useEffect(() => {
    if (selectedFriend) {
      inputRef.current?.focus();
    }
  }, [selectedFriend]);

  if (!selectedFriend) {
    return (
      <div 
        className="flex-1 flex items-center justify-center bg-[#2b2d2f] relative"
        style={{ 
          width: '100%',
          height: '100%',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        {/* Botão hamburger no mobile quando não há amigo selecionado */}
        {!sidebarOpen && onOpenSidebar && (
          <button
            onClick={() => onOpenSidebar()}
            className="md:hidden absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-lg bg-[#2b2d2f] border border-[#3a3c3f] text-white hover:bg-[#3a3c3f] active:bg-[#4a4c4f] transition-colors shadow-lg z-10"
            aria-label="Abrir menu de amigos"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        <div className="text-center w-full max-w-md px-4">
          <div className="text-5xl md:text-7xl mb-6 animate-bounce">👋</div>
          <h3 className="text-white text-lg md:text-xl font-bold mb-3">
            Selecione um amigo para começar a conversar
          </h3>
          <p className="text-[#6b6e70] text-sm md:text-base leading-relaxed">
            Escolha um amigo da lista ao lado para ver suas mensagens
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-chat-main-container
      className="flex-1 flex flex-col bg-[#2b2d2f] overflow-hidden min-h-0 h-full"
      style={{ 
        width: '100%',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header do Chat */}
      <div className="h-14 md:h-16 border-b border-[#3a3c3f]/50 flex items-center justify-between px-4 md:px-5 bg-gradient-to-r from-[#2b2d2f] to-[#252729] flex-shrink-0 relative shadow-md" style={{ flex: '0 0 auto' }}>
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
          {/* Botão hamburger antes da foto no mobile */}
          {!sidebarOpen && onOpenSidebar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSidebar();
              }}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-[#1f2022] border border-[#3a3c3f]/50 text-white hover:bg-[#3a3c3f] hover:border-[#3a3c3f] active:bg-[#4a4c4f] transition-all duration-200 shadow-lg flex-shrink-0 active:scale-95"
              aria-label="Abrir menu de amigos"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          )}
          <div className="relative flex-shrink-0">
            {selectedFriend.avatar_url ? (
              <div className="relative">
                <Image
                  src={selectedFriend.avatar_url}
                  alt={selectedFriend.display_name ?? 'Amigo'}
                  width={44}
                  height={44}
                  className="rounded-full object-cover ring-2 ring-[#3a3c3f]/50"
                />
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#2b2d2f] shadow-lg shadow-green-500/50">
                  <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-[#e2b714] to-[#d4c013] text-black flex items-center justify-center text-xs md:text-sm font-bold shadow-lg shadow-[#e2b714]/20 ring-2 ring-[#3a3c3f]/50">
                  {getInitials(selectedFriend.display_name)}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#2b2d2f] shadow-lg shadow-green-500/50">
                  <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-sm md:text-base truncate">
              {selectedFriend.display_name ?? 'Usuário'}
            </div>
            {selectedFriend.bestWpm !== null && (
              <div className="text-xs text-[#6b6e70] truncate flex items-center gap-1.5 mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span className="font-medium">Melhor: {selectedFriend.bestWpm} WPM</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/stats/${encodeURIComponent(selectedFriend.id)}`}
            onClick={() => {
              playClick();
              setCachedProfileForUser(
                selectedFriend.id,
                selectedFriend.display_name,
                selectedFriend.avatar_url
              );
            }}
            className="px-3 md:px-4 py-2 rounded-lg bg-[#3a3c3f] hover:bg-[#4a4c4f] text-white text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap hover:shadow-lg hover:shadow-black/20 active:scale-95 flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18"></path>
              <path d="m19 9-5 5-4-4-3 3"></path>
            </svg>
            Stats
          </Link>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
        style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          maxHeight: '100%',
          WebkitOverflowScrolling: 'touch',
          position: 'relative'
        }}
      >
        <div className="px-3 md:px-4 py-4 md:py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-[#6b6e70] text-sm">
                  Nenhuma mensagem ainda. Comece a conversar!
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === currentUserId;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showAvatar =
                  !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                const timeDiff = prevMsg
                  ? new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
                  : Infinity;
                const showTimeSeparator = timeDiff > 300000; // 5 minutos

                return (
                  <div key={msg.id}>
                    {showTimeSeparator && index > 0 && (
                      <div className="flex items-center justify-center my-4">
                        <div className="text-xs text-[#6b6e70] px-2">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    )}
                    <div
                      className={`flex gap-2 md:gap-3 min-w-0 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      style={{ minWidth: 0 }}
                    >
                      {!isOwn && (
                        <div className="flex-shrink-0">
                          {showAvatar ? (
                            selectedFriend.avatar_url ? (
                              <Image
                                src={selectedFriend.avatar_url}
                                alt={selectedFriend.display_name ?? 'Amigo'}
                                width={40}
                                height={40}
                                className="rounded-full object-cover ring-2 ring-[#3a3c3f]/50 shadow-md"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e2b714] to-[#d4c013] text-black flex items-center justify-center text-sm font-bold shadow-md shadow-[#e2b714]/20 ring-2 ring-[#3a3c3f]/50">
                                {getInitials(selectedFriend.display_name)}
                              </div>
                            )
                          ) : (
                            <div className="w-10"></div>
                          )}
                        </div>
                      )}
                      <div 
                        className={`flex flex-col max-w-[85%] md:max-w-[70%] min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}
                      >
                        {!isOwn && showAvatar && (
                          <div className="text-xs text-[#6b6e70] mb-1 px-1">
                            {selectedFriend.display_name ?? 'Usuário'}
                          </div>
                        )}
                        <div
                          className={`px-4 md:px-5 py-2.5 md:py-3 rounded-2xl shadow-lg ${
                            isOwn
                              ? 'bg-gradient-to-br from-[#e2b714] to-[#d4c013] text-black shadow-[#e2b714]/20'
                              : 'bg-[#3a3c3f] text-white shadow-black/20'
                          }`}
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            maxWidth: '100%',
                            minWidth: 0,
                          }}
                        >
                          <p 
                            className="text-sm md:text-base whitespace-pre-wrap leading-relaxed"
                            style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              overflow: 'hidden',
                              maxWidth: '100%',
                              minWidth: 0,
                            }}
                          >
                            {msg.content}
                          </p>
                        </div>
                        <div className="text-xs text-[#6b6e70] mt-1 px-1">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                      {isOwn && <div className="flex-shrink-0 w-10"></div>}
                    </div>
                  </div>
                );
              })}
              <div 
                ref={(node) => {
                  messagesEndRef.current = node;
                  // Quando o elemento de fim das mensagens é renderizado na primeira carga,
                  // garantir que o scroll vai para o final instantaneamente
                  if (node && isInitialLoadRef.current && messages.length > 0) {
                    const container = messagesContainerRef.current;
                    if (container) {
                      // Scroll instantâneo assim que o elemento estiver no DOM
                      requestAnimationFrame(() => {
                        container.scrollTop = container.scrollHeight;
                        requestAnimationFrame(() => {
                          container.scrollTop = container.scrollHeight;
                        });
                      });
                    }
                  }
                }} 
                className="h-4" 
              />
            </>
          )}
        </div>
      </div>

      {/* Input de Mensagem */}
      <div 
        data-chat-input-container
        className="border-t border-[#3a3c3f]/50 bg-gradient-to-r from-[#2b2d2f] to-[#252729] flex-shrink-0 shadow-lg z-50 w-full md:relative"
        style={{ 
          padding: '0.75rem',
          paddingBottom: 'max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom)))',
          paddingTop: '0.75rem',
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box',
          flexShrink: 0,
          minHeight: '60px',
          flex: '0 0 auto'
        }}
      >
        <div className="flex gap-2 md:gap-3">
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={e => onMessageChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Mensagem..."
            className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-[#1f2022] border border-[#3a3c3f]/50 rounded-xl text-white placeholder-[#6b6e70] focus:outline-none focus:border-[#e2b714]/60 focus:ring-2 focus:ring-[#e2b714]/20 transition-all duration-200 text-sm md:text-base shadow-inner"
            style={{
              fontSize: '16px' // Previne zoom no iOS quando o input recebe foco
            }}
          />
          <button
            onClick={() => {
              playClick();
              onSendMessage();
            }}
            disabled={!messageText.trim()}
            className="px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-[#e2b714] to-[#d4c013] text-black rounded-xl hover:shadow-lg hover:shadow-[#e2b714]/30 active:scale-95 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none text-sm md:text-base whitespace-nowrap flex items-center gap-1.5 md:gap-2 flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="md:w-4 md:h-4"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span className="hidden md:inline">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

