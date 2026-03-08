import React, { useState } from 'react';

const AVATARS = ['😎', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🐸', '🦄', '🐙', '🦋', '🌟', '🔥', '💎', '🎯', '🚀'];
const PALETTE = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#ef4444', '#22c55e', '#06b6d4', '#a855f7',
];

interface LoginScreenProps {
  onSignup: (email: string, password: string, name: string, color: string, avatar: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSignup, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Nhập tên'); setLoading(false); return; }
        await onSignup(email, password, name.trim(), color, avatar);
      } else {
        await onLogin(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">✏️</div>
        <h1 className="login-title">Whiteboard</h1>
        <p className="login-subtitle">Bảng vẽ cộng tác thời gian thực</p>

        {/* Tab toggle */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >Đăng nhập</button>
          <button
            className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >Đăng ký</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Mật khẩu</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {mode === 'signup' && (
            <>
              <div className="login-field">
                <label className="login-label">Tên hiển thị</label>
                <input
                  className="login-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên..."
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
            </>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading || !email || !password}
            style={{ background: color }}
          >
            {loading ? '⏳' : mode === 'signup' ? avatar : '→'}
            {' '}
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
