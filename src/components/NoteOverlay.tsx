import React, { useState, useRef, useEffect } from 'react';
import type { NoteShape, Viewport } from '../types';

interface NoteOverlayProps {
  notes: NoteShape[];
  viewport: Viewport;
  onUpdate: (note: NoteShape) => void;
  onDelete: (id: string) => void;
}

const NOTE_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7', '#ffe0b2'];

const NoteOverlay: React.FC<NoteOverlayProps> = ({ notes, viewport, onUpdate, onDelete }) => {
  return (
    <div className="notes-overlay" style={{ pointerEvents: 'none' }}>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          viewport={viewport}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

const NoteCard: React.FC<{
  note: NoteShape;
  viewport: Viewport;
  onUpdate: (note: NoteShape) => void;
  onDelete: (id: string) => void;
}> = ({ note, viewport, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);

  useEffect(() => {
    setContent(note.content);
  }, [note.content]);

  const screenX = note.x * viewport.zoom + viewport.x;
  const screenY = note.y * viewport.zoom + viewport.y;
  const screenW = note.width * viewport.zoom;
  const screenH = note.height * viewport.zoom;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    // Only drag from header area, not interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON') return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { ox: e.clientX - screenX, oy: e.clientY - screenY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const newX = (e.clientX - dragRef.current.ox - viewport.x) / viewport.zoom;
    const newY = (e.clientY - dragRef.current.oy - viewport.y) / viewport.zoom;
    onUpdate({ ...note, x: newX, y: newY });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };


  const handleBlur = () => {
    setIsEditing(false);
    onUpdate({ ...note, content });
  };

  const cycleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = NOTE_COLORS.indexOf(note.bgColor);
    const next = NOTE_COLORS[(idx + 1) % NOTE_COLORS.length];
    onUpdate({ ...note, bgColor: next });
  };

  return (
    <div
      className="note-card"
      style={{
        left: screenX,
        top: screenY,
        width: screenW,
        minHeight: screenH,
        background: note.bgColor,
        transform: `scale(${Math.min(Math.max(viewport.zoom, 0.3), 2) / viewport.zoom * viewport.zoom > 0.3 ? 1 : 1})`,
        fontSize: `${12 * viewport.zoom}px`,
        pointerEvents: 'auto',
        touchAction: 'none',
        cursor: isEditing ? 'text' : 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={() => {
        setIsEditing(true);
        setTimeout(() => textareaRef.current?.focus(), 0);
      }}
    >
      <div className="note-header">
        <button className="note-color-btn" onClick={cycleColor} title="Change color">🎨</button>
        <button className="note-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} title="Delete">✕</button>
      </div>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="note-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Escape') handleBlur(); }}
          style={{ fontSize: `${12 * viewport.zoom}px` }}
        />
      ) : (
        <div className="note-content" style={{ fontSize: `${12 * viewport.zoom}px` }}>
          {note.content || 'Double-click to edit…'}
        </div>
      )}
    </div>
  );
};

export { NOTE_COLORS };
export default NoteOverlay;
