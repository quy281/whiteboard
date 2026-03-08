import React, { useState } from 'react';
import type { Bookmark, Viewport } from '../types';
import { generateId } from '../utils';

interface PinsPanelProps {
  bookmarks: Bookmark[];
  viewport: Viewport;
  onNavigate: (bookmark: Bookmark) => void;
  onAdd: (bookmark: Bookmark) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

const PinsPanel: React.FC<PinsPanelProps> = ({
  bookmarks,
  viewport,
  onNavigate,
  onAdd,
  onRemove,
  onRename,
}) => {
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleSavePin = () => {
    const name = `Pin ${bookmarks.length + 1}`;
    onAdd({
      id: generateId(),
      name,
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    });
  };

  const startRename = (bm: Bookmark) => {
    setEditingId(bm.id);
    setEditName(bm.name);
  };

  const finishRename = (id: string) => {
    onRename(id, editName);
    setEditingId(null);
  };

  return (
    <div className={`pins-panel ${visible ? 'open' : 'collapsed'}`}>
      <button
        className="pins-toggle"
        onClick={() => setVisible(!visible)}
        title={visible ? 'Hide pins' : 'Show pins'}
      >
        📌 {visible ? '◂' : '▸'}
      </button>

      {visible && (
        <div className="pins-content">
          <div className="pins-header">
            <span className="pins-title">📌 Bookmarks</span>
            <button className="pins-add-btn" onClick={handleSavePin} title="Save current position">
              + Save
            </button>
          </div>

          {bookmarks.length === 0 && (
            <div className="pins-empty">No saved pins yet</div>
          )}

          <div className="pins-list">
            {bookmarks.map((bm) => (
              <div key={bm.id} className="pin-item">
                {editingId === bm.id ? (
                  <input
                    className="pin-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => finishRename(bm.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') finishRename(bm.id); }}
                    autoFocus
                  />
                ) : (
                  <button
                    className="pin-name"
                    onClick={() => onNavigate(bm)}
                    onDoubleClick={() => startRename(bm)}
                    title={`Go to (${Math.round(-bm.x / bm.zoom)}, ${Math.round(-bm.y / bm.zoom)}) @ ${Math.round(bm.zoom * 100)}%`}
                  >
                    {bm.name}
                  </button>
                )}
                <span className="pin-coords">
                  {Math.round(-bm.x / bm.zoom)}, {Math.round(-bm.y / bm.zoom)}
                </span>
                <button
                  className="pin-rename-btn"
                  onClick={() => startRename(bm)}
                  title="Đổi tên"
                >✏️</button>
                <button
                  className="pin-remove"
                  onClick={() => onRemove(bm.id)}
                  title="Delete pin"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PinsPanel;
