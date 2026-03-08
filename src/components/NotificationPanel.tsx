import React, { useState } from 'react';
import type { AppNotification } from '../hooks/useNotifications';

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onMarkAsRead: (id: string) => void;
  onClearRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  unreadCount,
  onAcceptInvite,
  onDeclineInvite,
  onMarkAsRead,
  onClearRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span>🔔 Thông báo</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {notifications.some(n => n.read) && (
                <button
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, color: '#94a3b8',
                  }}
                  onClick={onClearRead}
                >
                  Xoá đã đọc
                </button>
              )}
              <button className="modal-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <p>📭</p>
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? '' : 'unread'}`}
                  onClick={() => onMarkAsRead(notif.id)}
                >
                  <span className="notification-icon">
                    {notif.type === 'invite' ? '📩' : notif.type === 'activity' ? '🔵' : 'ℹ️'}
                  </span>
                  <div className="notification-body">
                    <div className="notification-text">
                      <strong>{notif.title}</strong><br />
                      {notif.message}
                    </div>
                    <div className="notification-time">{formatTime(notif.createdAt)}</div>
                    {notif.type === 'invite' && notif.inviteId && (
                      <div className="notification-actions">
                        <button
                          className="notification-accept"
                          onClick={(e) => { e.stopPropagation(); onAcceptInvite(notif.inviteId!); }}
                        >
                          ✓ Chấp nhận
                        </button>
                        <button
                          className="notification-decline"
                          onClick={(e) => { e.stopPropagation(); onDeclineInvite(notif.inviteId!); }}
                        >
                          ✕ Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationPanel;
