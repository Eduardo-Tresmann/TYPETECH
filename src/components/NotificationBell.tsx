"use client";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'record_beaten';
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

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => hasSupabaseConfig() ? getSupabase() : null, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read_at).length;
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
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        // Buscar perfis dos usuários relacionados
        const userIds = [...new Set(data.map(n => n.related_user_id).filter(Boolean))];
        
        const profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
        
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
                avatar_url: p.avatar_url 
              });
            });
          }

          // Para IDs sem perfil, tentar buscar do auth.users usando user_basic
          const foundIds = new Set(profiles?.map(p => p.id) || []);
          const missingIds = userIds.filter(id => !foundIds.has(id));
          
          if (missingIds.length > 0) {
            for (const missingId of missingIds) {
              try {
                const { data: userBasic, error: userErr } = await supabase.rpc('user_basic', { p_user: missingId });
                
                if (userErr) {
                  // Se der erro, usar fallback
                  profilesMap.set(missingId, {
                    display_name: 'Usuário',
                    avatar_url: null
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
                      avatar_url: user.avatar_url || null
                    });
                  } else {
                    profilesMap.set(missingId, {
                      display_name: 'Usuário',
                      avatar_url: null
                    });
                  }
                } else {
                  profilesMap.set(missingId, {
                    display_name: 'Usuário',
                    avatar_url: null
                  });
                }
              } catch (err) {
                // Se não conseguir buscar, usar fallback
                profilesMap.set(missingId, {
                  display_name: 'Usuário',
                  avatar_url: null
                });
              }
            }
          }

          const notificationsWithProfiles = data.map(n => ({
            ...n,
            sender_profile: n.related_user_id ? profilesMap.get(n.related_user_id) : undefined
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

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Remover da lista ao invés de apenas marcar como lida
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  // Marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    if (!supabase || !user) return;
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      // Remover todas as notificações não lidas da lista
      setNotifications(prev => prev.filter(n => n.read_at !== null));
    } catch (err) {
      console.error('Erro ao marcar todas as notificações como lidas:', err);
    }
  };

  // Lidar com clique em notificação
  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como lida e remover da lista imediatamente
    await markAsRead(notification.id);

    setIsOpen(false);

    switch (notification.type) {
      case 'friend_request':
        router.push('/friends?tab=invites');
        break;
      case 'message':
        if (notification.related_user_id) {
          router.push(`/friends?chat=${notification.related_user_id}`);
        } else {
          router.push('/friends');
        }
        break;
      case 'record_beaten':
        if (notification.related_user_id) {
          router.push(`/stats/${notification.related_user_id}`);
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
              filter: `user_id=eq.${user.id}`
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

  const getNotificationText = (notification: Notification) => {
    // Usar display_name, ou fallback para "Usuário" se não tiver
    const senderName = notification.sender_profile?.display_name || 'Usuário';
    
    switch (notification.type) {
      case 'friend_request':
        return `${senderName} enviou uma solicitação de amizade`;
      case 'message':
        return `${senderName} enviou uma mensagem`;
      case 'record_beaten':
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
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 text-white hover:text-[#e2b714] transition-colors"
        aria-label="Notificações"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
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
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[500px] bg-[#2c2e31] rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-[#3a3c3f] flex items-center justify-between">
            <h3 className="text-white font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#e2b714] hover:text-[#d4c013] transition-colors"
                title="Marcar todas como lidas"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto max-h-[450px]">
            {loading ? (
              <div className="p-4 text-center text-[#d1d1d1]">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-[#d1d1d1]">Nenhuma notificação</div>
            ) : (
              <div className="divide-y divide-[#3a3c3f]">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3 hover:bg-[#1f2022] transition-colors ${
                      !notification.read_at ? 'bg-[#1f2022]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.sender_profile?.avatar_url ? (
                        <img
                          src={notification.sender_profile.avatar_url}
                          alt={notification.sender_profile.display_name || 'Usuário'}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#e2b714] text-black flex items-center justify-center font-semibold flex-shrink-0">
                          {(notification.sender_profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read_at ? 'text-white font-medium' : 'text-[#d1d1d1]'}`}>
                          {getNotificationText(notification)}
                        </p>
                        <p className="text-xs text-[#6b6e70] mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read_at && (
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

