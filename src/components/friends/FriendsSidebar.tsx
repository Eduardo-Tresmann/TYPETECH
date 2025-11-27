'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { type Friend, type FriendRequest } from '@/services/FriendService';
import { getInitials } from '@/utils/avatar';
import { useSound } from '@/hooks/useSound';

type FriendsSidebarProps = {
  friends: Friend[];
  invites: FriendRequest[];
  selectedFriendId: string | null;
  onFriendSelect: (friend: Friend) => void;
  onInviteClick: () => void;
  onAddFriendClick: () => void;
  onRemoveFriend?: (friendId: string) => void;
  loading: boolean;
  isOpen?: boolean;
  onClose?: () => void;
};

export default function FriendsSidebar({
  friends,
  invites,
  selectedFriendId,
  onFriendSelect,
  onInviteClick,
  onAddFriendClick,
  onRemoveFriend,
  loading,
  isOpen = true,
  onClose,
}: FriendsSidebarProps) {
  const { playClick } = useSound();
  const [hoveredFriendId, setHoveredFriendId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Ordenar amigos: mais recentes primeiro (baseado na última mensagem ou data de criação)
  // Por enquanto, vamos manter a ordem original mas podemos melhorar depois
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      // Se tiver WPM, priorizar quem tem
      if (a.bestWpm !== null && b.bestWpm === null) return -1;
      if (a.bestWpm === null && b.bestWpm !== null) return 1;
      return 0;
    });
  }, [friends]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return sortedFriends;
    const query = searchQuery.toLowerCase();
    return sortedFriends.filter(
      f => f.display_name?.toLowerCase().includes(query)
    );
  }, [sortedFriends, searchQuery]);

  const unreadInvitesCount = invites.length;

  const handleFriendSelect = (friend: Friend) => {
    playClick();
    onFriendSelect(friend);
    // Fechar sidebar em mobile após selecionar
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <div
        className={`fixed md:static left-0 z-50 md:z-auto w-64 md:w-64 bg-[#1f2022] border-r border-[#3a3c3f] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ 
          top: '56px', 
          bottom: 0,
          height: 'calc(100vh - 56px)', 
          maxHeight: 'calc(100vh - 56px)',
          width: '256px'
        }}
      >
        {/* Header */}
        <div className="px-3 pt-2 pb-2.5 border-b border-[#3a3c3f] flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-bold text-sm uppercase tracking-wide">
              AMIGOS
            </h2>
            <div className="flex items-center gap-2">
              {/* Botão fechar em mobile */}
              {onClose && (
                <button
                  onClick={() => {
                    playClick();
                    onClose();
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#2b2d2f] text-[#d1d1d1] hover:text-white transition-colors md:hidden"
                  title="Fechar"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
              <button
                onClick={() => {
                  playClick();
                  onAddFriendClick();
                  if (onClose) onClose();
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#2b2d2f] text-[#d1d1d1] hover:text-white transition-colors"
                title="Adicionar amigo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mt-2">
            <input
              type="text"
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#2b2d2f] border border-[#3a3c3f] rounded text-sm text-white placeholder-[#6b6e70] focus:outline-none focus:border-[#e2b714] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#6b6e70] hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Convites */}
          {unreadInvitesCount > 0 && (
            <div className="p-1.5">
              <button
                onClick={() => {
                  playClick();
                  onInviteClick();
                  if (onClose) onClose();
                }}
                className="w-full px-3 py-2 rounded bg-[#2b2d2f] hover:bg-[#3a3c3f] text-left transition-colors group relative"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-xs font-semibold">
                    🔔
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      Convites
                    </div>
                    <div className="text-xs text-[#6b6e70]">
                      {unreadInvitesCount} {unreadInvitesCount === 1 ? 'novo' : 'novos'}
                    </div>
                  </div>
                  {unreadInvitesCount > 0 && (
                    <div className="w-2 h-2 rounded-full bg-[#e2b714]"></div>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Lista de Amigos */}
          <div className="px-2 py-2">
            <div className="text-xs font-semibold text-[#6b6e70] uppercase tracking-wide px-2 mb-2">
              Online — {filteredFriends.length}
            </div>
            
            {loading ? (
              <div className="space-y-1 px-2">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded animate-pulse"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#2c2e31]"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-[#2c2e31] rounded w-24 mb-1"></div>
                      <div className="h-3 bg-[#2c2e31] rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <div className="text-[#6b6e70] text-sm">
                  {searchQuery ? 'Nenhum amigo encontrado' : 'Nenhum amigo ainda'}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredFriends.map(friend => {
                  const isSelected = selectedFriendId === friend.id;
                  const isHovered = hoveredFriendId === friend.id;

                  return (
                    <div
                      key={friend.id}
                      onMouseEnter={() => setHoveredFriendId(friend.id)}
                      onMouseLeave={() => setHoveredFriendId(null)}
                      className="group relative"
                    >
                      <button
                        onClick={() => handleFriendSelect(friend)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded transition-colors ${
                          isSelected
                            ? 'bg-[#3a3c3f] text-white'
                            : 'hover:bg-[#2b2d2f] text-[#d1d1d1]'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          {friend.avatar_url ? (
                            <Image
                              src={friend.avatar_url}
                              alt={friend.display_name ?? 'Amigo'}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center text-sm font-semibold">
                              {getInitials(friend.display_name)}
                            </div>
                          )}
                          {/* Indicador online (pode ser melhorado depois) */}
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#1f2022]"></div>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium truncate">
                            {friend.display_name ?? 'Usuário'}
                          </div>
                          {friend.bestWpm !== null && (
                            <div className="text-xs text-[#6b6e70] truncate">
                              {friend.bestWpm} WPM
                            </div>
                          )}
                        </div>
                      </button>
                      
                      {/* Botão remover no hover */}
                      {isHovered && onRemoveFriend && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            playClick();
                            onRemoveFriend(friend.id);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded hover:bg-[#ca4754] text-[#6b6e70] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover amigo"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
