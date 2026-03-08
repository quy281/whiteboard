import React, { useState } from 'react';

const AVATARS = ['😎', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🐸', '🦄', '🐙', '🦋', '🌟', '🔥', '💎', '🎯', '🚀'];
const PALETTE = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#ef4444', '#22c55e', '#06b6d4', '#a855f7',
];

interface LoginScreenProps {
  onLogin: (name: string, color: string, avatar: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim(), color, avatar);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">✏️</div>
        <h1 className="login-title">Whiteboard</h1>
        <p className="login-subtitle">Bảng vẽ cộng tác thời gian thực</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Tên của bạn</label>
            <input
              className="login-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên..."
              autoFocus
              maxLength={20}
            />
          </div>

          <div className="login-field">
            <label className="login-label">Chọn avatar</label>
            <div className="login-avatars">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`login-avatar-btn ${avatar === a ? 'active' : ''}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Màu đại diện</label>
            <div className="login-colors">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`login-color-btn ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={!name.trim()}
            style={{ background: color }}
          >
            <span className="login-submit-avatar">{avatar}</span>
            Bắt đầu
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
