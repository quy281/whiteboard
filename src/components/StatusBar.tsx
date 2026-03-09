import React from 'react';
import type { UserInfo, Viewport } from '../types';

interface StatusBarProps {
  viewport: Viewport;
  roomId: string;
  users: UserInfo[];
  isConnected: boolean;
  isOnline: boolean;
  onGoHome: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ viewport, roomId, users, isConnected: _isConnected, isOnline, onGoHome }) => {
  const zoomPercent = Math.round(viewport.zoom * 100);
  const worldX = Math.round(-viewport.x / viewport.zoom);
  const worldY = Math.round(-viewport.y / viewport.zoom);

  const copyRoomLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copy-link-btn');
      if (btn) {
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
          btn.textContent = '🔗 Share';
        }, 1500);
      }
    });
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="zoom-badge">{zoomPercent}%</span>
        <span className="coords-display">({worldX}, {worldY})</span>
        <button className="home-btn" onClick={onGoHome} title="Go to origin (0, 0)">
          📌 Home
        </button>
      </div>

      <div className="status-center">
        <span
          className={`connection-dot ${isOnline ? 'connected' : ''}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
        <span className="room-label" style={{ opacity: isOnline ? 0.7 : 1, color: isOnline ? undefined : '#ef4444' }}>
          {isOnline ? `Room: ${roomId.slice(0, 12)}…` : '⚡ Offline'}
        </span>
        {isOnline && (
          <button id="copy-link-btn" className="share-btn" onClick={copyRoomLink}>
            🔗 Share
          </button>
        )}
      </div>

      <div className="status-right">
        <div className="user-avatars">
          {users.map((u) => (
            <div
              key={u.id}
              className="user-avatar"
              style={{ background: u.color }}
              title={u.name}
            >
              {u.name[0]}
            </div>
          ))}
        </div>
        <span className="user-count">{users.length} online</span>
      </div>
    </div>
  );
};

export default StatusBar;
