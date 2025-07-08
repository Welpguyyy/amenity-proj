import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import supabase from '../lib/supabaseclient';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  title?: string;
  icon?: string;
  timestamp?: Date | string | number;
  isRead?: boolean;
}

export const useNotifications = () => {
  const { data: session } = useSession();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bibleTimeLeft, setBibleTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    isExpired: false
  });

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Group and filter logic
      const seenBibleReminder = new Set<string>();
      const filtered = data.filter((n) => {
        if (n.type !== 'bible_reminder') return true;

        // Extract date portion (YYYY-MM-DD) from created_at
        const date = n.created_at.split('T')[0];
        if (seenBibleReminder.has(date)) {
          return false; // already added bible_reminder for this day
        } else {
          seenBibleReminder.add(date);
          return true;
        }
      });

      setNotifications(filtered);
      setUnreadCount(filtered.filter(n => !n.is_read).length);
    }
  }, [session?.user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    if (!error) {
      fetchNotifications();
    }
  }, [session?.user?.id, fetchNotifications]);

  const calculateBibleTimeLeft = useCallback(() => {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const diffMs = endOfDay.getTime() - now.getTime();
    const isExpired = diffMs <= 0;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    setBibleTimeLeft({
      hours: isExpired ? 0 : hours,
      minutes: isExpired ? 0 : minutes,
      isExpired
    });
  }, []);

  useEffect(() => {
    fetchNotifications();
    calculateBibleTimeLeft();

    const interval = setInterval(() => {
      fetchNotifications();
      calculateBibleTimeLeft();
    }, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, [fetchNotifications, calculateBibleTimeLeft]);

  return {
    notifications,
    unreadCount,
    bibleTimeLeft,
    markAsRead,
    markAllAsRead,
    updateNotifications: fetchNotifications
  };
};
