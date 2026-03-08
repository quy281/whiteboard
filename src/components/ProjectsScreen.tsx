import React, { useState, type ReactNode } from 'react';
import type { Project, Board, UserProfile } from '../types';

interface ProjectsScreenProps {
  profile: UserProfile;
  projects: Project[];
  boards: Board[];
  recentBoards: Board[];
  onCreateProject: (name: string, description?: string) => Promise<Project>;
  onDeleteProject: (id: string) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => Promise<void>;
  onCreateBoard: (projectId: string, name: string, customRoomId?: string, password?: string) => Promise<Board>;
  onDeleteBoard: (id: string) => Promise<void>;
  onRenameBoard: (id: string, name: string) => Promise<void>;
  onOpenBoard: (board: Board) => void;
  onJoinRoom: (roomId: string) => void;
  onOpenProfile: () => void;
  onShareProject: (projectId: string, projectName: string) => void;
  getBoardsForProject: (projectId: string) => Board[];
  notificationPanel?: ReactNode;
}

const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  profile,
  projects,
  onCreateProject,
  onDeleteProject,
  onUpdateProject,
  onCreateBoard,
  onDeleteBoard,
  onRenameBoard,
  onOpenBoard,
  onJoinRoom,
  onOpenProfile,
  onShareProject,
  getBoardsForProject,
  recentBoards,
  notificationPanel,
}) => {
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardRoomId, setNewBoardRoomId] = useState('');
  const [newBoardPassword, setNewBoardPassword] = useState('');
  const [addingBoardFor, setAddingBoardFor] = useState<string | null>(null);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [editBoardName, setEditBoardName] = useState('');

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      const project = await onCreateProject(newProjectName.trim(), newProjectDesc.trim());
      setNewProjectName('');
      setNewProjectDesc('');
      setShowNewProject(false);
      setExpandedProject(project.id);
    }
  };

  const handleCreateBoard = async (projectId: string) => {
    if (newBoardName.trim()) {
      await onCreateBoard(projectId, newBoardName.trim(), newBoardRoomId.trim() || undefined, newBoardPassword.trim() || undefined);
      setNewBoardName('');
      setNewBoardRoomId('');
      setNewBoardPassword('');
      setAddingBoardFor(null);
    }
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      onJoinRoom(roomCode.trim());
      setRoomCode('');
      setShowJoinRoom(false);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="projects-screen">
      {/* Header */}
      <header className="projects-header">
        <div className="projects-header-left">
          <span className="projects-logo">✏️</span>
          <h1 className="projects-brand">Whiteboard</h1>
        </div>
        <div className="projects-header-right">
          <button className="projects-join-btn" onClick={() => setShowJoinRoom(true)}>
            🔗 Tham gia phòng
          </button>
          {notificationPanel}
          <button className="projects-profile-btn" onClick={onOpenProfile} style={{ background: profile.color }}>
            <span>{profile.avatar}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="projects-content">
        {/* Recent boards section */}
        {recentBoards.length > 0 && (
          <div className="recent-boards-section">
            <h2 className="projects-section-title">⏰ Bảng vẽ gần đây</h2>
            <div className="recent-boards-row">
              {recentBoards.map((board) => (
                <button
                  key={board.id}
                  className="recent-board-chip"
                  onClick={() => onOpenBoard(board)}
                  title={`Mở ${board.name}`}
                >
                  <span className="recent-board-icon">📋</span>
                  <span className="recent-board-name">{board.name}</span>
                  <span className="recent-board-date">{formatDate(board.updatedAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="projects-actions">
          <h2 className="projects-section-title">Dự án của tôi</h2>
          <button className="btn-primary-sm" onClick={() => setShowNewProject(true)}>
            + Tạo dự án
          </button>
        </div>

        {/* New project form */}
        {showNewProject && (
          <div className="project-new-form">
            <input
              className="login-input"
              placeholder="Tên dự án..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <input
              className="login-input"
              placeholder="Mô tả (tuỳ chọn)..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <div className="project-new-actions">
              <button className="btn-secondary" onClick={() => setShowNewProject(false)}>Huỷ</button>
              <button className="btn-primary-sm" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Tạo
              </button>
            </div>
          </div>
        )}

        {/* Projects list */}
        {projects.length === 0 && !showNewProject && (
          <div className="projects-empty">
            <span className="projects-empty-icon">📁</span>
            <p>Chưa có dự án nào</p>
            <p className="projects-empty-hint">Nhấn "Tạo dự án" để bắt đầu</p>
          </div>
        )}

        <div className="projects-list">
          {projects.map((project) => {
            const pBoards = getBoardsForProject(project.id);
            const isExpanded = expandedProject === project.id;

            return (
              <div key={project.id} className="project-card">
                <div
                  className="project-card-header"
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                >
                  <div className="project-card-color" style={{ background: project.color }} />
                  <div className="project-card-info">
                    {editingProject === project.id ? (
                      <input
                        className="inline-edit-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => {
                          if (editName.trim()) onUpdateProject(project.id, { name: editName.trim() });
                          setEditingProject(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingProject(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span className="project-card-name">{project.name}</span>
                    )}
                    {project.description && (
                      <span className="project-card-desc">{project.description}</span>
                    )}
                    <span className="project-card-meta">
                      {pBoards.length} bảng · {formatDate(project.updatedAt)}
                    </span>
                  </div>
                  <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="icon-btn"
                      title="Chia sẻ"
                      onClick={() => onShareProject(project.id, project.name)}
                    >👥</button>
                    <button
                      className="icon-btn"
                      title="Đổi tên"
                      onClick={() => { setEditingProject(project.id); setEditName(project.name); }}
                    >✏️</button>
                    <button
                      className="icon-btn icon-btn-danger"
                      title="Xoá dự án"
                      onClick={() => {
                        if (confirm(`Xoá dự án "${project.name}" và tất cả bảng vẽ?`)) {
                          onDeleteProject(project.id);
                        }
                      }}
                    >🗑️</button>
                  </div>
                  <span className={`project-expand-icon ${isExpanded ? 'expanded' : ''}`}>▸</span>
                </div>

                {/* Boards list */}
                {isExpanded && (
                  <div className="project-boards">
                    {pBoards.map((board) => (
                      <div key={board.id} className="board-item">
                        <span className="board-item-icon">📋</span>
                        {editingBoard === board.id ? (
                          <input
                            className="inline-edit-input"
                            value={editBoardName}
                            onChange={(e) => setEditBoardName(e.target.value)}
                            onBlur={() => {
                              if (editBoardName.trim()) onRenameBoard(board.id, editBoardName.trim());
                              setEditingBoard(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingBoard(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <button className="board-item-name" onClick={() => onOpenBoard(board)}>
                            {board.name}
                          </button>
                        )}
                        {board.password && <span className="board-lock-icon" title="Có mật khẩu">🔒</span>}
                        <span className="board-item-date">{formatDate(board.updatedAt)}</span>
                        <button
                          className="icon-btn-sm"
                          onClick={() => { setEditingBoard(board.id); setEditBoardName(board.name); }}
                        >✏️</button>
                        <button
                          className="icon-btn-sm icon-btn-danger"
                          onClick={() => {
                            if (confirm(`Xoá bảng "${board.name}"?`)) onDeleteBoard(board.id);
                          }}
                        >🗑️</button>
                      </div>
                    ))}

                    {/* Add board */}
                    {addingBoardFor === project.id ? (
                      <div className="board-add-form">
                        <input
                          className="login-input login-input-sm"
                          placeholder="Tên bảng vẽ..."
                          value={newBoardName}
                          onChange={(e) => setNewBoardName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateBoard(project.id);
                            if (e.key === 'Escape') setAddingBoardFor(null);
                          }}
                        />
                        <input
                          className="login-input login-input-sm"
                          placeholder="Mã phòng (tuỳ chọn)..."
                          value={newBoardRoomId}
                          onChange={(e) => setNewBoardRoomId(e.target.value)}
                        />
                        <input
                          className="login-input login-input-sm"
                          placeholder="Mật khẩu (tuỳ chọn)..."
                          type="password"
                          value={newBoardPassword}
                          onChange={(e) => setNewBoardPassword(e.target.value)}
                        />
                        <button className="btn-primary-xs" onClick={() => handleCreateBoard(project.id)}>
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        className="board-add-btn"
                        onClick={() => { setAddingBoardFor(project.id); setNewBoardName(''); setNewBoardRoomId(''); setNewBoardPassword(''); }}
                      >
                        + Thêm bảng vẽ
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Join room modal */}
      {showJoinRoom && (
        <div className="modal-overlay" onClick={() => setShowJoinRoom(false)}>
          <div className="modal-card modal-card-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Tham gia phòng</h2>
              <button className="modal-close" onClick={() => setShowJoinRoom(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="login-field">
                <label className="login-label">Mã phòng hoặc link</label>
                <input
                  className="login-input"
                  placeholder="Nhập mã phòng..."
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowJoinRoom(false)}>Huỷ</button>
              <button className="btn-primary-sm" onClick={handleJoinRoom} disabled={!roomCode.trim()}>
                Tham gia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsScreen;
