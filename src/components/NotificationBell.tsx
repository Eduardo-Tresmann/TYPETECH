'use client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './ui/LoadingSpinner';

type Notification = {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_request_accepted' | 'message' | 'record_beaten';
  related_id: string | null;
  related_user_id: string | null;
  metadata: any;
  read_at: string | null;
  created_at: string;
  sender_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

type GroupedNotification = {
  id: string; // ID do grupo (related_user_id para mensagens)
  type: 'friend_request' | 'friend_request_accepted' | 'message' | 'record_beaten';
  related_user_id: string | null;
  notifications: Notification[];
  sender_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  created_at: string; // Data da notificação mais recente
  read_at: string | null; // null se alguma notificação não foi lida
};

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => (hasSupabaseConfig() ? getSupabase() : null), []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read_at).length;
  }, [notifications]);

  // Agrupar notificações de mensagem do mesmo usuário
  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, GroupedNotification>();
    const ungrouped: GroupedNotification[] = [];

    notifications.forEach(notification => {
      // Agrupar apenas notificações de mensagem do mesmo usuário
      if (notification.type === 'message' && notification.related_user_id) {
        const groupKey = notification.related_user_id;
        
        if (groups.has(groupKey)) {
          const group = groups.get(groupKey)!;
          group.notifications.push(notification);
          // Atualizar data para a mais recente
          if (new Date(notification.created_at) > new Date(group.created_at)) {
            group.created_at = notification.created_at;
          }
          // Se alguma notificação não foi lida, o grupo não foi lido
          if (!notification.read_at) {
            group.read_at = null;
          }
        } else {
          groups.set(groupKey, {
            id: groupKey,
            type: notification.type,
            related_user_id: notification.related_user_id,
            notifications: [notification],
            sender_profile: notification.sender_profile,
            created_at: notification.created_at,
            read_at: notification.read_at,
          });
        }
      } else {
        // Notificações que não são de mensagem ou não têm related_user_id não são agrupadas
        ungrouped.push({
          id: notification.id,
          type: notification.type,
          related_user_id: notification.related_user_id,
          notifications: [notification],
          sender_profile: notification.sender_profile,
          created_at: notification.created_at,
          read_at: notification.read_at,
        });
      }
    });

    // Combinar grupos e não agrupados, ordenando por data (mais recente primeiro)
    const allGroups = [...Array.from(groups.values()), ...ungrouped];
    return allGroups.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications]);

  // Buscar notificações
  const loadNotifications = async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('read_at', null) // Buscar apenas notificações não lidas
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        // Buscar perfis dos usuários relacionados
        const userIds = [...new Set(data.map(n => n.related_user_id).filter(Boolean))];

        const profilesMap = new Map<
          string,
          { display_name: string | null; avatar_url: string | null }
        >();

        if (userIds.length > 0) {
          // Buscar da tabela profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds);

          if (profiles) {
            profiles.forEach(p => {
              profilesMap.set(p.id, {
                display_name: p.display_name,
                avatar_url: p.avatar_url,
              });
            });
          }

          // Para IDs sem perfil, tentar buscar do auth.users usando user_basic
          const foundIds = new Set(profiles?.map(p => p.id) || []);
          const missingIds = userIds.filter(id => !foundIds.has(id));

          if (missingIds.length > 0) {
            for (const missingId of missingIds) {
              try {
                const { data: userBasic, error: userErr } = await supabase.rpc('user_basic', {
                  p_user: missingId,
                });

                if (userErr) {
                  // Se der erro, usar fallback
                  profilesMap.set(missingId, {
                    display_name: 'Usuário',
                    avatar_url: null,
                  });
                  continue;
                }

                if (userBasic) {
                  const userArray = Array.isArray(userBasic) ? userBasic : [userBasic];
                  const user = userArray.length > 0 ? userArray[0] : null;

                  if (user && user.id) {
                    // user_basic já retorna display_name com fallback para email
                    profilesMap.set(user.id, {
                      display_name: user.display_name || 'Usuário',
                      avatar_url: user.avatar_url || null,
                    });
                  } else {
                    profilesMap.set(missingId, {
                      display_name: 'Usuário',
                      avatar_url: null,
                    });
                  }
                } else {
                  profilesMap.set(missingId, {
                    display_name: 'Usuário',
                    avatar_url: null,
                  });
                }
              } catch (err) {
                // Se não conseguir buscar, usar fallback
                profilesMap.set(missingId, {
                  display_name: 'Usuário',
                  avatar_url: null,
                });
              }
            }
          }

          const notificationsWithProfiles = data.map(n => ({
            ...n,
            sender_profile: n.related_user_id ? profilesMap.get(n.related_user_id) : undefined,
          }));

          setNotifications(notificationsWithProfiles as Notification[]);
        } else {
          setNotifications(data as Notification[]);
        }
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  // Marcar notificação como lida e deletar do banco
  const markAsRead = async (notificationId: string) => {
    if (!supabase) return;
    try {
      // Deletar a notificação do banco ao invés de apenas marcar como lida
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

      if (error) throw error;

      // Remover da lista
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  // Marcar todas as notificações como lidas e deletar do banco
  const markAllAsRead = async () => {
    if (!supabase || !user) return;
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);

      if (unreadIds.length === 0) return;

      // Deletar todas as notificações não lidas do banco
      const { error } = await supabase.from('notifications').delete().in('id', unreadIds);

      if (error) throw error;

      // Limpar todas as notificações da lista
      setNotifications([]);
    } catch (err) {
      console.error('Erro ao marcar todas as notificações como lidas:', err);
    }
  };

  // Lidar com clique em notificação agrupada
  const handleGroupedNotificationClick = async (group: GroupedNotification) => {
    if (!supabase) return;

    // Marcar todas as notificações do grupo como lidas
    const notificationIds = group.notifications.map(n => n.id);
    try {
      const { error } = await supabase.from('notifications').delete().in('id', notificationIds);
      if (error) throw error;

      // Remover todas as notificações do grupo da lista
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
    } catch (err) {
      console.error('Erro ao marcar notificações do grupo como lidas:', err);
    }

    setIsOpen(false);

    switch (group.type) {
      case 'friend_request':
        router.push('/friends?tab=invites');
        break;
      case 'friend_request_accepted':
        router.push('/friends');
        break;
      case 'message':
        if (group.related_user_id) {
          router.push(`/friends?chat=${group.related_user_id}`);
        } else {
          router.push('/friends');
        }
        break;
      case 'record_beaten':
        if (group.related_user_id) {
          router.push(`/stats/${group.related_user_id}`);
        } else {
          router.push('/leaderboards');
        }
        break;
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Carregar notificações quando usuário estiver logado
  useEffect(() => {
    if (user) {
      loadNotifications();

      // Configurar subscription para atualizações em tempo real
      if (supabase) {
        const channel = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              loadNotifications();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]);

  if (!user) return null;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getNotificationText = (group: GroupedNotification) => {
    // Usar display_name, ou fallback para "Usuário" se não tiver
    const senderName = group.sender_profile?.display_name || 'Usuário';

    switch (group.type) {
      case 'friend_request':
        return `${senderName} enviou uma solicitação de amizade`;
      case 'friend_request_accepted':
        return `${senderName} aceitou sua solicitação de amizade`;
      case 'message':
        const messageCount = group.notifications.length;
        if (messageCount === 1) {
          return `${senderName} enviou uma mensagem`;
        } else {
          return `${senderName} enviou ${messageCount} mensagens`;
        }
      case 'record_beaten':
        const notification = group.notifications[0];
        const metadata = notification.metadata || {};
        const wpm = metadata.wpm || 0;
        const totalTime = metadata.total_time || 0;
        return `${senderName} superou seu recorde de ${totalTime}s com ${wpm} WPM`;
      default:
        return 'Nova notificação';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-white hover:text-[#e2b714] transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
        aria-label="Notificações"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 sm:w-6 sm:h-6"
        >
          <path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-black bg-[#e2b714] rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-[calc(3.5rem+0.5rem)] sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[calc(100vw-1rem)] sm:max-w-none max-h-[calc(100vh-5rem)] sm:max-h-[500px] bg-[#2c2e31] rounded-lg shadow-lg overflow-hidden z-[100] border border-[#3a3c3f]">
          <div className="p-3 border-b border-[#3a3c3f] flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm sm:text-base">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#e2b714] hover:text-[#d4c013] transition-colors min-h-[44px] px-2"
                title="Marcar todas como lidas"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[450px]">
            {loading ? (
              <div className="p-4 flex items-center justify-center gap-2 text-[#d1d1d1] text-sm">
                <LoadingSpinner size="sm" />
                <span>Carregando...</span>
              </div>
            ) : groupedNotifications.length === 0 ? (
              <div className="p-8 text-center text-[#d1d1d1]">
                <div className="text-2xl sm:text-3xl mb-2">🔔</div>
                <div className="text-xs sm:text-sm">Nenhuma notificação</div>
              </div>
            ) : (
              <div className="divide-y divide-[#3a3c3f]">
                {groupedNotifications.map(group => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupedNotificationClick(group)}
                    className={`w-full text-left p-3 hover:bg-[#1f2022] transition-colors min-h-[44px] ${
                      !group.read_at ? 'bg-[#1f2022]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {group.sender_profile?.avatar_url ? (
                        <img
                          src={group.sender_profile.avatar_url}
                          alt={group.sender_profile.display_name || 'Usuário'}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 max-w-full h-auto"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0">
                          {(group.sender_profile?.display_name || 'U')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs sm:text-sm ${!group.read_at ? 'text-white font-medium' : 'text-[#d1d1d1]'}`}
                        >
                          {getNotificationText(group)}
                        </p>
                        <p className="text-xs text-[#6b6e70] mt-1">
                          {formatTimeAgo(group.created_at)}
                        </p>
                      </div>
                      {!group.read_at && (
                        <div className="w-2 h-2 rounded-full bg-[#e2b714] flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
