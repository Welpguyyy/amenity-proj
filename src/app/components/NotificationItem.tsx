import React from 'react';
import { Notification } from '../lib/notificationService';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  Like,
  Fire,
  Bible,
  SaveChapIcon,
  Delete,
  Comments
} from '../components/svgs';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead 
}) => {
  const router = useRouter();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Like':
        return <Like />;
      case 'Fire':
        return <Fire />;
      case 'Bible':
        return <Bible />;
      case 'SaveChapIcon':
        return <SaveChapIcon />;
      case 'Delete':
        return <Delete />;
      case 'Comments':
        return <Comments />;
      default:
        return <Fire />;
    }
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = dayjs();
    const time = dayjs(timestamp);
    const diffMinutes = now.diff(time, 'minute');
    const diffHours = now.diff(time, 'hour');
    const diffDays = now.diff(time, 'day');

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div 
      className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '1rem 1.25rem',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '0.9rem',
        backgroundColor: notification.is_read ? 'transparent' : 'rgba(255, 232, 163, 0.05)',
        position: 'relative'
      }}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div style={{
          position: 'absolute',
          left: '0.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '6px',
          height: '6px',
          backgroundColor: '#ffe8a3',
          borderRadius: '50%'
        }} />
      )}

      {/* Icon */}
      <div style={{
        marginRight: '12px',
        fontSize: '1.1rem',
        minWidth: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: notification.type === 'bible_reminder' ? '#ffe8a3' : '#f5f0e9'
      }}>
        {getIcon(notification.type)}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          color: '#f5f0e9',
          fontWeight: notification.is_read ? 'normal' : '600',
          marginBottom: '0.25rem',
          lineHeight: '1.4'
        }}>
          {notification.message}
        </div>
        
        <div style={{
          color: '#8b9cb3',
          fontSize: '0.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{notification.type}</span>
          <span>{formatTimeAgo(new Date(notification.created_at))}</span>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem; 