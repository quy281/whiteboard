import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export interface AppNotification {
  id: string;
  type: 'invite' | 'activity' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  /** For invite notifications */
  projectId?: string;
  projectName?: string;
  inviterName?: string;
  inviteId?: string;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load notifications from Supabase (invitations + activities)
  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      // Load pending invitations as notifications
      const { data: invites } = await supabase
        .from('project_members')
        .select('id, project_id, role, created_at, projects(name)')
        .eq('user_id', userId)
        .eq('status', 'pending');

      const inviteNotifs: AppNotification[] = (invites || []).map((inv: Record<string, unknown>) => {
        const project = inv.projects as Record<string, unknown> | null;
        return {
          id: `invite-${inv.id}`,
          type: 'invite' as const,
          title: '📩 Lời mời tham gia',
          message: `Bạn được mời vào dự án "${project?.name || 'Không rõ'}"`,
          read: false,
          createdAt: new Date(inv.created_at as string).getTime(),
          projectId: inv.project_id as string,
          projectName: (project?.name as string) || '',
          inviteId: inv.id as string,
        };
      });

      // Load activity notifications from notifications table
      const { data: activityData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      const activityNotifs: AppNotification[] = (activityData || []).map((n: Record<string, unknown>) => ({
        id: n.id as string,
        type: (n.type as string) as 'activity' | 'info',
        title: n.title as string,
        message: n.message as string,
        read: n.read as boolean,
        createdAt: new Date(n.created_at as string).getTime(),
      }));

      setNotifications([...inviteNotifs, ...activityNotifs].sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      // Notifications table may not exist yet — silently ignore
    }
  }, [userId]);

  // Poll every 15 seconds
  useEffect(() => {
    if (!userId) return;
    loadNotifications();
    pollingRef.current = setInterval(loadNotifications, 15000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userId, loadNotifications]);

  // Accept invitation
  const acceptInvite = useCallback(async (inviteId: string) => {
    try {
      await supabase
        .from('project_members')
        .update({ status: 'accepted' })
        .eq('id', inviteId);
      setNotifications((prev) => prev.filter((n) => n.inviteId !== inviteId));
    } catch {
      // ignore
    }
  }, []);

  // Decline invitation
  const declineInvite = useCallback(async (inviteId: string) => {
    try {
      await supabase
        .from('project_members')
        .delete()
        .eq('id', inviteId);
      setNotifications((prev) => prev.filter((n) => n.inviteId !== inviteId));
    } catch {
      // ignore
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    // Only update DB for activity notifications (not invite- prefixed)
    if (!notifId.startsWith('invite-')) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('id', notifId);
      } catch {
        // ignore
      }
    }
  }, []);

  // Clear all read notifications
  const clearRead = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => !n.read));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    acceptInvite,
    declineInvite,
    markAsRead,
    clearRead,
    reload: loadNotifications,
  };
}
