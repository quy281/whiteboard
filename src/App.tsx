import { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import NoteOverlay from './components/NoteOverlay';
import ChecklistOverlay from './components/ChecklistOverlay';
import BudgetOverlay from './components/BudgetOverlay';
import PinsPanel from './components/PinsPanel';
import LoginScreen from './components/LoginScreen';
import ProjectsScreen from './components/ProjectsScreen';
import ProfileModal from './components/ProfileModal';
import ShareModal from './components/ShareModal';
import NotificationPanel from './components/NotificationPanel';
import { useHistory } from './hooks/useHistory';
import { useCollaboration } from './hooks/useCollaboration';
import { useUserSession } from './hooks/useUserSession';
import { useProjects } from './hooks/useProjects';
import { useNotifications } from './hooks/useNotifications';
import type { Shape, Tool, Viewport, NoteShape, ChecklistShape, BudgetShape, Bookmark, AppScreen, Board } from './types';
import { generateId, screenToWorld } from './utils';
import { NOTE_COLORS } from './components/NoteOverlay';
import './index.css';

function App() {
  // ── Session & Profile ──
  const { user, profile, isLoggedIn, isLoading, signup, login, updateProfile, logout } = useUserSession();

  // ── Screen routing ──
  const [screen, setScreen] = useState<AppScreen>('login');
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [shareProject, setShareProject] = useState<{ id: string; name: string } | null>(null);
  const [showRoomShare, setShowRoomShare] = useState(false);

  // ── Password modal ──
  const [passwordPrompt, setPasswordPrompt] = useState<{ board: Board; input: string } | null>(null);

  // ── Notifications ──
  const {
    notifications,
    unreadCount,
    acceptInvite,
    declineInvite,
    markAsRead,
    clearRead,
    reload: reloadNotifications,
  } = useNotifications(user?.id);

  // Set initial screen based on auth state
  useEffect(() => {
    if (!isLoading) {
      setScreen(isLoggedIn ? 'projects' : 'login');
    }
  }, [isLoading, isLoggedIn]);

  // ── Projects ──
  const {
    projects,
    boards,
    isLoading: projectsLoading,
    createProject,
    updateProject,
    deleteProject,
    createBoard,
    deleteBoard,
    renameBoard,
    loadBoardData,
    saveBoardData,
    getBoardsForProject,
    getRecentBoards,
  } = useProjects(user?.id);

  // ── Whiteboard State ──
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [notes, setNotes] = useState<NoteShape[]>([]);
  const [checklists, setChecklists] = useState<ChecklistShape[]>([]);
  const [budgets, setBudgets] = useState<BudgetShape[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const { pushToHistory, undo, redo, canUndo, canRedo } = useHistory(shapes, setShapes);

  // ── Collaboration ──
  const handleShapesChange = useCallback((newShapes: Shape[]) => {
    setShapes(newShapes);
  }, []);

  const {
    shapesArray,
    awareness,
    cursors,
    users,
    roomId,
    isConnected,
  } = useCollaboration(
    handleShapesChange,
    profile,
    activeBoard?.roomId
  );

  useEffect(() => {
    if (shapesArray && shapesArray.length > 0 && shapes.length === 0) {
      setShapes(shapesArray.toArray());
    }
  }, [shapesArray, shapes.length]);

  // ── Auto-save board data ──
  const activeBoardRef = useRef(activeBoard);
  activeBoardRef.current = activeBoard;

  useEffect(() => {
    if (!activeBoardRef.current) return;
    saveBoardData(activeBoardRef.current.id, {
      shapes, notes, checklists, budgets, bookmarks, viewport,
    });
  }, [shapes, notes, checklists, budgets, bookmarks, viewport, saveBoardData]);

  // ── Board open/close ──
  const handleOpenBoard = useCallback(async (board: Board) => {
    // Check password
    if (board.password) {
      setPasswordPrompt({ board, input: '' });
      return;
    }
    const data = await loadBoardData(board.id);
    setShapes(data.shapes);
    setNotes(data.notes);
    setChecklists(data.checklists);
    setBudgets(data.budgets || []);
    setBookmarks(data.bookmarks);
    setViewport(data.viewport);
    setActiveBoard(board);
    setScreen('board');
  }, [loadBoardData]);

  const handlePasswordSubmit = useCallback(async () => {
    if (!passwordPrompt) return;
    if (passwordPrompt.input === passwordPrompt.board.password) {
      const data = await loadBoardData(passwordPrompt.board.id);
      setShapes(data.shapes);
      setNotes(data.notes);
      setChecklists(data.checklists);
      setBudgets(data.budgets || []);
      setBookmarks(data.bookmarks);
      setViewport(data.viewport);
      setActiveBoard(passwordPrompt.board);
      setScreen('board');
      setPasswordPrompt(null);
    } else {
      alert('Mật khẩu không đúng!');
    }
  }, [passwordPrompt, loadBoardData]);

  const handleBackToProjects = useCallback(() => {
    if (activeBoard) {
      saveBoardData(activeBoard.id, {
        shapes, notes, checklists, budgets, bookmarks, viewport,
      });
    }
    setActiveBoard(null);
    setShapes([]);
    setNotes([]);
    setChecklists([]);
    setBudgets([]);
    setBookmarks([]);
    setViewport({ x: 0, y: 0, zoom: 1 });
    setScreen('projects');
  }, [activeBoard, shapes, notes, checklists, budgets, bookmarks, viewport, saveBoardData]);

  const handleJoinRoom = useCallback((roomCode: string) => {
    const board: Board = {
      id: generateId(),
      projectId: '',
      name: 'Phòng: ' + roomCode.slice(0, 12),
      roomId: roomCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setActiveBoard(board);
    setShapes([]);
    setNotes([]);
    setChecklists([]);
    setBudgets([]);
    setBookmarks([]);
    setViewport({ x: 0, y: 0, zoom: 1 });
    setScreen('board');
  }, []);

  // ── Shape handlers ──
  const handleShapeAdd = useCallback(
    (shape: Shape) => {
      pushToHistory();
      if (shapesArray) {
        shapesArray.push([shape]);
      } else {
        setShapes((prev) => [...prev, shape]);
      }
    },
    [shapesArray, pushToHistory]
  );

  const handleShapeUpdate = useCallback((_shape: Shape) => { }, []);
  const handleShapeComplete = useCallback(() => { }, []);

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      if (awareness) {
        awareness.setLocalStateField('cursor', { x, y });
      }
    },
    [awareness]
  );

  const handleClear = useCallback(() => {
    pushToHistory();
    if (shapesArray) {
      shapesArray.delete(0, shapesArray.length);
    } else {
      setShapes([]);
    }
  }, [shapesArray, pushToHistory]);

  const handleGoHome = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  // ── Canvas click for note/checklist/budget ──
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tool !== 'note' && tool !== 'checklist' && tool !== 'budget') return;

      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy, viewport);

      if (tool === 'note') {
        const note: NoteShape = {
          type: 'note',
          id: generateId(),
          x: world.x,
          y: world.y,
          width: 220,
          height: 160,
          content: '',
          bgColor: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        };
        setNotes((prev) => [...prev, note]);
        setTool('pen');
      } else if (tool === 'checklist') {
        const cl: ChecklistShape = {
          type: 'checklist',
          id: generateId(),
          x: world.x,
          y: world.y,
          width: 240,
          title: 'Checklist',
          items: [],
          bgColor: '#e8f5e9',
        };
        setChecklists((prev) => [...prev, cl]);
        setTool('pen');
      } else if (tool === 'budget') {
        const bg: BudgetShape = {
          type: 'budget',
          id: generateId(),
          x: world.x,
          y: world.y,
          width: 320,
          title: 'Ngân sách',
          items: [],
          bgColor: '#fff8e1',
        };
        setBudgets((prev) => [...prev, bg]);
        setTool('pen');
      }
    },
    [tool, viewport]
  );

  const handleNoteUpdate = useCallback((note: NoteShape) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
  }, []);

  const handleNoteDelete = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleChecklistUpdate = useCallback((cl: ChecklistShape) => {
    setChecklists((prev) => prev.map((c) => (c.id === cl.id ? cl : c)));
  }, []);

  const handleChecklistDelete = useCallback((id: string) => {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleBudgetUpdate = useCallback((bg: BudgetShape) => {
    setBudgets((prev) => prev.map((b) => (b.id === bg.id ? bg : b)));
  }, []);

  const handleBudgetDelete = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleBookmarkAdd = useCallback((bm: Bookmark) => {
    setBookmarks((prev) => [...prev, bm]);
  }, []);

  const handleBookmarkRemove = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleBookmarkRename = useCallback((id: string, name: string) => {
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)));
  }, []);

  const handleBookmarkNavigate = useCallback((bm: Bookmark) => {
    setViewport({ x: bm.x, y: bm.y, zoom: bm.zoom });
  }, []);

  // Keyboard shortcuts (board view only)
  useEffect(() => {
    if (screen !== 'board') return;

    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        else if (e.key === 'y') { e.preventDefault(); redo(); }
      }

      switch (e.key) {
        case 'p': setTool('pen'); break;
        case 'l': setTool('line'); break;
        case 'r': setTool('rect'); break;
        case 'e': setTool('ellipse'); break;
        case 't': setTool('text'); break;
        case 'n': setTool('note'); break;
        case 'c': setTool('checklist'); break;
        case 'b': setTool('budget'); break;
        case 'x': setTool('eraser'); break;
        case 'h': handleGoHome(); break;
        case ' ': setTool('pan'); e.preventDefault(); break;
        case 'Escape': handleBackToProjects(); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setTool('pen');
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen, undo, redo, handleGoHome, handleBackToProjects]);

  // ── Auth handlers ──
  const handleSignup = useCallback(async (email: string, password: string, name: string, userColor: string, avatar: string) => {
    await signup(email, password, name, userColor, avatar);
  }, [signup]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    await login(email, password);
  }, [login]);

  const handleLogout = useCallback(async () => {
    await logout();
    setScreen('login');
    setShowProfile(false);
  }, [logout]);

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Đang tải...</p>
      </div>
    );
  }

  // ── Login Screen ──
  if (screen === 'login' || !isLoggedIn) {
    return <LoginScreen onSignup={handleSignup} onLogin={handleLogin} />;
  }

  // ── Wait for profile to be ready ──
  if (!profile) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Đang tải hồ sơ...</p>
      </div>
    );
  }

  // Shared notification panel props
  const notifProps = {
    notifications,
    unreadCount,
    onAcceptInvite: async (id: string) => { await acceptInvite(id); reloadNotifications(); },
    onDeclineInvite: async (id: string) => { await declineInvite(id); },
    onMarkAsRead: markAsRead,
    onClearRead: clearRead,
  };

  // ── Projects Screen ──
  if (screen === 'projects') {
    return (
      <>
        {projectsLoading ? (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <p>Đang tải dự án...</p>
          </div>
        ) : (
          <ProjectsScreen
            profile={profile!}
            projects={projects}
            boards={boards}
            recentBoards={getRecentBoards(5)}
            onCreateProject={createProject}
            onDeleteProject={deleteProject}
            onUpdateProject={updateProject}
            onCreateBoard={createBoard}
            onDeleteBoard={deleteBoard}
            onRenameBoard={renameBoard}
            onOpenBoard={handleOpenBoard}
            onJoinRoom={handleJoinRoom}
            onOpenProfile={() => setShowProfile(true)}
            onShareProject={(id, name) => setShareProject({ id, name })}
            getBoardsForProject={getBoardsForProject}
            notificationPanel={<NotificationPanel {...notifProps} />}
          />
        )}
        {showProfile && profile && (
          <ProfileModal
            name={profile.name}
            color={profile.color}
            avatar={profile.avatar}
            onSave={updateProfile}
            onLogout={handleLogout}
            onClose={() => setShowProfile(false)}
          />
        )}
        {shareProject && (
          <ShareModal
            projectId={shareProject.id}
            projectName={shareProject.name}
            onClose={() => setShareProject(null)}
          />
        )}
        {/* Password prompt modal */}
        {passwordPrompt && (
          <div className="modal-overlay" onClick={() => setPasswordPrompt(null)}>
            <div className="modal-card modal-card-sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">🔒 Nhập mật khẩu</h2>
                <button className="modal-close" onClick={() => setPasswordPrompt(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: 12, opacity: 0.7 }}>Bảng "{passwordPrompt.board.name}" yêu cầu mật khẩu</p>
                <input
                  className="login-input"
                  type="password"
                  placeholder="Nhập mật khẩu..."
                  value={passwordPrompt.input}
                  onChange={(e) => setPasswordPrompt({ ...passwordPrompt, input: e.target.value })}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setPasswordPrompt(null)}>Huỷ</button>
                <button className="btn-primary-sm" onClick={handlePasswordSubmit}>Mở</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Board View ──
  return (
    <div className="app">
      <div className="toolbar toolbar-top">
        <button className="tool-btn tool-btn-compact" onClick={handleBackToProjects} title="Quay lại">
          ◀
        </button>
        <div className="toolbar-divider toolbar-divider-compact" />
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onClear={handleClear}
          position="top"
        />
        <div className="toolbar-spacer" />
        <NotificationPanel {...notifProps} />
        <button
          className="projects-profile-btn-sm"
          onClick={() => setShowProfile(true)}
          style={{ background: profile?.color }}
          title="Hồ sơ"
        >
          {profile?.avatar}
        </button>
      </div>

      <div
        className="canvas-container"
        onClick={handleCanvasClick}
        style={{ cursor: tool === 'note' || tool === 'checklist' || tool === 'budget' ? 'copy' : undefined }}
      >
        <Canvas
          shapes={shapes}
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          viewport={viewport}
          onViewportChange={setViewport}
          onShapeAdd={handleShapeAdd}
          onShapeUpdate={handleShapeUpdate}
          onShapeComplete={handleShapeComplete}
          onCursorMove={handleCursorMove}
          cursors={cursors}
        />

        <NoteOverlay
          notes={notes}
          viewport={viewport}
          onUpdate={handleNoteUpdate}
          onDelete={handleNoteDelete}
        />
        <ChecklistOverlay
          checklists={checklists}
          viewport={viewport}
          onUpdate={handleChecklistUpdate}
          onDelete={handleChecklistDelete}
        />
        <BudgetOverlay
          budgets={budgets}
          viewport={viewport}
          onUpdate={handleBudgetUpdate}
          onDelete={handleBudgetDelete}
        />

        {(tool === 'note' || tool === 'checklist' || tool === 'budget') && (
          <div className="placement-hint">
            Nhấn để đặt {tool === 'note' ? '📝 Ghi chú' : tool === 'checklist' ? '☑️ Checklist' : '💰 Ngân sách'}
          </div>
        )}
      </div>

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onClear={handleClear}
        position="bottom"
      />

      <StatusBar
        viewport={viewport}
        roomId={roomId}
        users={users}
        isConnected={isConnected}
        onGoHome={handleGoHome}
      />

      <PinsPanel
        bookmarks={bookmarks}
        viewport={viewport}
        onNavigate={handleBookmarkNavigate}
        onAdd={handleBookmarkAdd}
        onRemove={handleBookmarkRemove}
        onRename={handleBookmarkRename}
      />

      {activeBoard && (
        <div className="board-name-badge">
          📋 {activeBoard.name}
        </div>
      )}

      {/* Room share floating button */}
      <button
        className="room-share-fab"
        onClick={() => setShowRoomShare(!showRoomShare)}
        title="Chia sẻ phòng"
      >
        🔗
      </button>

      {showRoomShare && (
        <div className="room-share-panel">
          <div className="room-share-header">
            <span>Chia sẻ phòng vẽ</span>
            <button className="modal-close" onClick={() => setShowRoomShare(false)}>✕</button>
          </div>
          <div className="room-share-code">{roomId}</div>
          <button
            className="btn-primary-sm"
            style={{ width: '100%' }}
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}#${roomId}`;
              navigator.clipboard.writeText(url);
              setShowRoomShare(false);
            }}
          >
            📋 Copy link
          </button>
          <p className="room-share-hint">Gửi link này cho người khác để vẽ chung real-time</p>
        </div>
      )}

      {showProfile && profile && (
        <ProfileModal
          name={profile.name}
          color={profile.color}
          avatar={profile.avatar}
          onSave={updateProfile}
          onLogout={handleLogout}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

export default App;
