import React, { useState } from 'react';

const AVATARS = ['😎', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🐸', '🦄', '🐙', '🦋', '🌟', '🔥', '💎', '🎯', '🚀'];
const PALETTE = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#ef4444', '#22c55e', '#06b6d4', '#a855f7',
];

interface ProfileModalProps {
  name: string;
  color: string;
  avatar: string;
  onSave: (updates: { name?: string; color?: string; avatar?: string }) => void;
  onLogout: () => void;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  name: initName,
  color: initColor,
  avatar: initAvatar,
  onSave,
  onLogout,
  onClose,
}) => {
  const [name, setName] = useState(initName);
  const [color, setColor] = useState(initColor);
  const [avatar, setAvatar] = useState(initAvatar);

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name: name.trim(), color, avatar });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Hồ sơ</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="profile-preview" style={{ background: color }}>
            <span className="profile-preview-avatar">{avatar}</span>
            <span className="profile-preview-name">{name || '...'}</span>
          </div>

          <div className="login-field">
            <label className="login-label">Tên</label>
            <input
              className="login-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="login-field">
            <label className="login-label">Avatar</label>
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
            <label className="login-label">Màu</label>
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
        </div>

        <div className="modal-footer">
          <button className="btn-danger" onClick={onLogout}>Đăng xuất</button>
          <button className="btn-primary" onClick={handleSave} style={{ background: color }}>
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
