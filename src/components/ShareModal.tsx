import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import { supabase } from '../supabaseClient';

interface ShareModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface Member {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  color: string;
  role: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ projectId, projectName, onClose }) => {
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    const { data } = await supabase
      .from('project_members')
      .select('id, user_id, role')
      .eq('project_id', projectId);

    if (data && data.length > 0) {
      const userIds = data.map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar, color')
        .in('id', userIds);

      const memberList: Member[] = data.map((m: { id: string; user_id: string; role: string }) => {
        const p = profiles?.find((pr: UserProfile) => pr.id === m.user_id);
        return {
          id: m.id,
          userId: m.user_id,
          name: p?.name || 'User',
          avatar: p?.avatar || '😎',
          color: p?.color || '#6366f1',
          role: m.role,
        };
      });
      setMembers(memberList);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Find user by email using the SQL function
      const { data: targetUserId, error: lookupError } = await supabase
        .rpc('find_user_by_email', { email_input: email.trim().toLowerCase() });

      if (lookupError || !targetUserId) {
        setError('Không tìm thấy người dùng với email này. Họ cần đăng ký trước.');
        setLoading(false);
        return;
      }

      // Check not already a member
      const { data: existing } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existing) {
        setError('Người này đã là thành viên của dự án');
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Add member
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: targetUserId,
          role: 'editor',
          invited_by: user?.id,
        });

      if (insertError) {
        setError('Không thể thêm thành viên: ' + insertError.message);
      } else {
        setSuccess('Đã mời thành công!');
        setEmail('');
        loadMembers();
      }
    } catch {
      setError('Đã xảy ra lỗi');
    }

    setLoading(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from('project_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Chia sẻ: {projectName}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="login-field">
            <label className="login-label">Mời bằng email</label>
            <div className="share-invite-row">
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <button
                className="btn-primary-sm"
                onClick={handleInvite}
                disabled={loading || !email.trim()}
              >
                {loading ? '⏳' : '📩'} Mời
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="share-success">{success}</div>}

          <div className="login-field">
            <label className="login-label">Thành viên ({members.length})</label>
            {members.length === 0 ? (
              <p className="share-empty">Chưa mời ai</p>
            ) : (
              <div className="share-members-list">
                {members.map((m) => (
                  <div key={m.id} className="share-member-item">
                    <span className="share-member-avatar" style={{ background: m.color }}>
                      {m.avatar}
                    </span>
                    <span className="share-member-name">{m.name}</span>
                    <span className="share-member-role">{m.role}</span>
                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={() => handleRemoveMember(m.id)}
                      title="Xoá"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <span className="share-hint">💡 Người được mời cần đăng ký trước</span>
          <button className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
