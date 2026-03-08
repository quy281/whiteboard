import { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import NoteOverlay from './components/NoteOverlay';
import ChecklistOverlay from './components/ChecklistOverlay';
import PinsPanel from './components/PinsPanel';
import { useHistory } from './hooks/useHistory';
import { useCollaboration } from './hooks/useCollaboration';
import type { Shape, Tool, Viewport, NoteShape, ChecklistShape, Bookmark } from './types';
import { generateId, screenToWorld } from './utils';
import { NOTE_COLORS } from './components/NoteOverlay';
import './index.css';

function App() {
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

  // Notes & Checklists (stored separately from canvas shapes)
  const [notes, setNotes] = useState<NoteShape[]>([]);
  const [checklists, setChecklists] = useState<ChecklistShape[]>([]);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem('wb-bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('wb-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const { pushToHistory, undo, redo, canUndo, canRedo } = useHistory(shapes, setShapes);

  // Collaboration
  const handleShapesChange = useCallback((newShapes: Shape[]) => {
    setShapes(newShapes);
  }, []);

  const {
    shapesArray,
    awareness,
    cursors,
    users,
    localUser,
    roomId,
    isConnected,
  } = useCollaboration(handleShapesChange);

  useEffect(() => {
    if (shapesArray && shapesArray.length > 0 && shapes.length === 0) {
      setShapes(shapesArray.toArray());
    }
  }, [shapesArray, shapes.length]);

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

  // ── Canvas click for note/checklist placement ──────────────
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

  // Note/Checklist handlers
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

  // Bookmark handlers
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore shortcuts when editing text
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
  }, [undo, redo, handleGoHome]);

  return (
    <div className="app">
      {/* Top bar: tools only */}
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

        {/* Note & Checklist overlays on top of canvas */}
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

        {/* Placement hint */}
        {(tool === 'note' || tool === 'checklist') && (
          <div className="placement-hint">
            Click anywhere to place a {tool === 'note' ? '📝 Note' : '☑️ Checklist'}
          </div>
        )}
      </div>

      {/* Bottom bar: colors, stroke, undo/redo */}
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

      {/* Pins panel - right side */}
      <PinsPanel
        bookmarks={bookmarks}
        viewport={viewport}
        onNavigate={handleBookmarkNavigate}
        onAdd={handleBookmarkAdd}
        onRemove={handleBookmarkRemove}
        onRename={handleBookmarkRename}
      />

      {/* Welcome toast */}
      <div className="welcome-toast" key={localUser.id}>
        <span className="user-dot" style={{ background: localUser.color }} />
        Welcome, <strong>{localUser.name}</strong>!
        <span className="shortcut-hint">P/L/R/E/T/N/C/X · Space pan · H home</span>
      </div>
    </div>
  );
}

export default App;
