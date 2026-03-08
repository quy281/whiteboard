import { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import NoteOverlay from './components/NoteOverlay';
import ChecklistOverlay from './components/ChecklistOverlay';
import PinsPanel from './components/PinsPanel';
import LoginScreen from './components/LoginScreen';
import ProjectsScreen from './components/ProjectsScreen';
import ProfileModal from './components/ProfileModal';
import ShareModal from './components/ShareModal';
import { useHistory } from './hooks/useHistory';
import { useCollaboration } from './hooks/useCollaboration';
import { useUserSession } from './hooks/useUserSession';
import { useProjects } from './hooks/useProjects';
import type { Shape, Tool, Viewport, NoteShape, ChecklistShape, Bookmark, AppScreen, Board } from './types';
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
  } = useProjects(user?.id);

  // ── Whiteboard State ──
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [notes, setNotes] = useState<NoteShape[]>([]);
  const [checklists, setChecklists] = useState<ChecklistShape[]>([]);
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
      shapes, notes, checklists, bookmarks, viewport,
    });
  }, [shapes, notes, checklists, bookmarks, viewport, saveBoardData]);

  // ── Board open/close ──
  const handleOpenBoard = useCallback(async (board: Board) => {
    const data = await loadBoardData(board.id);
    setShapes(data.shapes);
    setNotes(data.notes);
    setChecklists(data.checklists);
    setBookmarks(data.bookmarks);
    setViewport(data.viewport);
    setActiveBoard(board);
    setScreen('board');
  }, [loadBoardData]);

  const handleBackToProjects = useCallback(() => {
    if (activeBoard) {
      saveBoardData(activeBoard.id, {
        shapes, notes, checklists, bookmarks, viewport,
      });
    }
    setActiveBoard(null);
    setShapes([]);
    setNotes([]);
    setChecklists([]);
    setBookmarks([]);
    setViewport({ x: 0, y: 0, zoom: 1 });
    setScreen('projects');
  }, [activeBoard, shapes, notes, checklists, bookmarks, viewport, saveBoardData]);

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

  // ── Canvas click for note/checklist ──
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tool !== 'note' && tool !== 'checklist') return;

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
        style={{ cursor: tool === 'note' || tool === 'checklist' ? 'copy' : undefined }}
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

        {(tool === 'note' || tool === 'checklist') && (
          <div className="placement-hint">
            Nhấn để đặt {tool === 'note' ? '📝 Ghi chú' : '☑️ Checklist'}
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
