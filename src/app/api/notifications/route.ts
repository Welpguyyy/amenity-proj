import { NextRequest, NextResponse } from 'next/server';
import NotificationService from '@/app/lib/notificationService';

export async function GET() {
  try {
    const notificationService = NotificationService.getInstance();
    const notifications = notificationService.getNotifications();
    const unreadCount = notificationService.getUnreadCount();
    const bibleTimeLeft = notificationService.getBibleReadingTimeLeft();

    return NextResponse.json({
      notifications,
      unreadCount,
      bibleTimeLeft
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, notificationId } = await request.json();
    const notificationService = NotificationService.getInstance();

    switch (action) {
      case 'markAsRead':
        if (notificationId) {
          notificationService.markAsRead(notificationId);
        }
        break;
      case 'markAllAsRead':
        notificationService.markAllAsRead();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedNotifications = notificationService.getNotifications();
    const unreadCount = notificationService.getUnreadCount();

    return NextResponse.json({
      notifications: updatedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
} 