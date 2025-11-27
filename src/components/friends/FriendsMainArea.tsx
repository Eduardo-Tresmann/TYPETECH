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
        className="flex-1 flex items-center justify-center bg-[#323437] relative"
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
          <div className="text-4xl md:text-6xl mb-4">👋</div>
          <h3 className="text-white text-lg md:text-xl font-semibold mb-2">
            Selecione um amigo para começar a conversar
          </h3>
          <p className="text-[#6b6e70] text-sm md:text-base">
            Escolha um amigo da lista ao lado para ver suas mensagens
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-[#2b2d2f] overflow-hidden"
      style={{ 
        width: '100%',
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Header do Chat */}
      <div className="h-14 md:h-16 border-b border-[#3a3c3f] flex items-center justify-between px-3 md:px-4 bg-[#2b2d2f] flex-shrink-0 relative">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          {/* Botão hamburger antes da foto no mobile */}
          {!sidebarOpen && onOpenSidebar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSidebar();
              }}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-[#2b2d2f] border border-[#3a3c3f] text-white hover:bg-[#3a3c3f] active:bg-[#4a4c4f] transition-colors shadow-lg flex-shrink-0"
              aria-label="Abrir menu de amigos"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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
          <div className="flex-shrink-0">
            {selectedFriend.avatar_url ? (
              <Image
                src={selectedFriend.avatar_url}
                alt={selectedFriend.display_name ?? 'Amigo'}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-xs md:text-sm font-semibold">
                {getInitials(selectedFriend.display_name)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-semibold text-sm md:text-base truncate">
              {selectedFriend.display_name ?? 'Usuário'}
            </div>
            {selectedFriend.bestWpm !== null && (
              <div className="text-xs text-[#6b6e70] truncate">
                Melhor: {selectedFriend.bestWpm} WPM
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
            className="px-2 md:px-3 py-1.5 rounded bg-[#3a3c3f] hover:bg-[#4a4c4f] text-white text-xs md:text-sm transition-colors whitespace-nowrap"
          >
            Stats
          </Link>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          WebkitOverflowScrolling: 'touch'
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
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">
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
                          className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg ${
                            isOwn
                              ? 'bg-[#e2b714] text-black'
                              : 'bg-[#3a3c3f] text-white'
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
        className="border-t border-[#3a3c3f] bg-[#2b2d2f] flex-shrink-0"
        style={{ 
          padding: '0.75rem',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={e => onMessageChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Mensagem..."
            className="flex-1 px-3 py-2 bg-[#1f2022] border border-[#3a3c3f] rounded-lg text-white placeholder-[#6b6e70] focus:outline-none focus:border-[#e2b714] transition-colors text-sm md:text-base"
          />
          <button
            onClick={() => {
              playClick();
              onSendMessage();
            }}
            disabled={!messageText.trim()}
            className="px-3 md:px-4 py-2 bg-[#e2b714] text-black rounded-lg hover:bg-[#d4c013] active:bg-[#c4b012] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

