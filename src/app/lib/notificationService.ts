// src/app/lib/notificationService.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface Notification {
  id: string;
  type: string;
  user_id: string;
  post_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeNotifications() {
    const now = dayjs().tz('Asia/Manila').toISOString();

    this.notifications = [
      {
        id: '1',
        type: 'like',
        user_id: 'demo-user',
        message: 'New likes/comments on your posts',
        is_read: false,
        created_at: now
      },
      {
        id: '2',
        type: 'flag',
        user_id: 'demo-user',
        message: 'Your post has been flagged by admin',
        is_read: false,
        created_at: now
      },
      {
        id: '3',
        type: 'bible_reminder',
        user_id: 'demo-user',
        message: this.getBibleReadingReminderMessage(),
        is_read: false,
        created_at: now
      },
      {
        id: '4',
        type: 'streak',
        user_id: 'demo-user',
        message: 'Reading Streak milestones',
        is_read: false,
        created_at: now
      },
      {
        id: '5',
        type: 'trending',
        user_id: 'demo-user',
        message: 'Popular posts trending',
        is_read: false,
        created_at: now
      },
      {
        id: '6',
        type: 'deleted',
        user_id: 'demo-user',
        message: 'Post deleted by admin',
        is_read: false,
        created_at: now
      }
    ];
  }

  private getBibleReadingReminderMessage(): string {
    const now = dayjs().tz('Asia/Manila');
    const endOfDay = now.endOf('day');
    const timeLeft = endOfDay.diff(now, 'hour', true);

    if (timeLeft <= 0) {
      return 'Daily reading period has ended. Start tomorrow\'s reading!';
    } else if (timeLeft < 1) {
      const minutesLeft = Math.floor(endOfDay.diff(now, 'minute'));
      return `Only ${minutesLeft} minutes left for today's reading!`;
    } else {
      const hoursLeft = Math.floor(timeLeft);
      const minutesLeft = Math.floor((timeLeft - hoursLeft) * 60);
      return minutesLeft > 0
        ? `${hoursLeft}h ${minutesLeft}m remaining for today's reading`
        : `${hoursLeft} hours remaining for today's reading`;
    }
  }

  public getNotifications(): Notification[] {
    const bibleReminder = this.notifications.find(n => n.type === 'bible_reminder');
    if (bibleReminder) {
      bibleReminder.message = this.getBibleReadingReminderMessage();
      bibleReminder.created_at = new Date().toISOString();
    }

    return this.notifications;
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.is_read).length;
  }

  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.is_read = true;
      notification.read_at = new Date().toISOString();
    }
  }

  public markAllAsRead(): void {
    const now = new Date().toISOString();
    this.notifications.forEach(n => {
      n.is_read = true;
      n.read_at = now;
    });
  }

  public addNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read_at' | 'is_read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      is_read: false,
      created_at: new Date().toISOString(),
      read_at: null
    };

    this.notifications.unshift(newNotification);

    if (this.notifications.length > 20) {
      this.notifications = this.notifications.slice(0, 20);
    }
  }

  public removeNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }

  public getBibleReadingTimeLeft(): { hours: number; minutes: number; isExpired: boolean } {
    const now = dayjs().tz('Asia/Manila');
    const endOfDay = now.endOf('day');
    const timeLeft = endOfDay.diff(now, 'hour', true);

    if (timeLeft <= 0) {
      return { hours: 0, minutes: 0, isExpired: true };
    }

    const hours = Math.floor(timeLeft);
    const minutes = Math.floor((timeLeft - hours) * 60);
    return { hours, minutes, isExpired: false };
  }
}

export default NotificationService;
