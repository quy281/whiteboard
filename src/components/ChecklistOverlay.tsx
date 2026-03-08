import React, { useState, useRef, useEffect } from 'react';
import type { ChecklistShape, ChecklistItem, Viewport } from '../types';
import { generateId } from '../utils';

interface ChecklistOverlayProps {
  checklists: ChecklistShape[];
  viewport: Viewport;
  onUpdate: (cl: ChecklistShape) => void;
  onDelete: (id: string) => void;
}

const ChecklistOverlay: React.FC<ChecklistOverlayProps> = ({
  checklists,
  viewport,
  onUpdate,
  onDelete,
}) => {
  return (
    <div className="checklists-overlay" style={{ pointerEvents: 'none' }}>
      {checklists.map((cl) => (
        <ChecklistCard
          key={cl.id}
          checklist={cl}
          viewport={viewport}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

const ChecklistCard: React.FC<{
  checklist: ChecklistShape;
  viewport: Viewport;
  onUpdate: (cl: ChecklistShape) => void;
  onDelete: (id: string) => void;
}> = ({ checklist, viewport, onUpdate, onDelete }) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(checklist.title);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);

  useEffect(() => {
    setTitle(checklist.title);
  }, [checklist.title]);

  const screenX = checklist.x * viewport.zoom + viewport.x;
  const screenY = checklist.y * viewport.zoom + viewport.y;
  const screenW = checklist.width * viewport.zoom;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    if ((e.target as HTMLElement).closest('.cl-interactive')) return;
    e.stopPropagation();
    dragRef.current = { ox: e.clientX - screenX, oy: e.clientY - screenY };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const newX = (ev.clientX - dragRef.current.ox - viewport.x) / viewport.zoom;
      const newY = (ev.clientY - dragRef.current.oy - viewport.y) / viewport.zoom;
      onUpdate({ ...checklist, x: newX, y: newY });
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const toggleItem = (itemId: string) => {
    const items = checklist.items.map((it) =>
      it.id === itemId ? { ...it, checked: !it.checked } : it
    );
    onUpdate({ ...checklist, items });
  };

  const removeItem = (itemId: string) => {
    const items = checklist.items.filter((it) => it.id !== itemId);
    onUpdate({ ...checklist, items });
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const item: ChecklistItem = { id: generateId(), text: newItemText.trim(), checked: false };
    onUpdate({ ...checklist, items: [...checklist.items, item] });
    setNewItemText('');
  };

  const startEditItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditItemText(item.text);
  };

  const saveEditItem = (itemId: string) => {
    if (editItemText.trim()) {
      const items = checklist.items.map((it) =>
        it.id === itemId ? { ...it, text: editItemText.trim() } : it
      );
      onUpdate({ ...checklist, items });
    }
    setEditingItemId(null);
  };

  const saveTitle = () => {
    setEditingTitle(false);
    onUpdate({ ...checklist, title });
  };

  const checkedCount = checklist.items.filter((i) => i.checked).length;

  return (
    <div
      className="checklist-card"
      style={{
        left: screenX,
        top: screenY,
        width: screenW,
        background: checklist.bgColor,
        fontSize: `${12 * viewport.zoom}px`,
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="cl-header">
        {editingTitle ? (
          <input
            ref={titleRef}
            className="cl-title-input cl-interactive"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); }}
            autoFocus
          />
        ) : (
          <span
            className="cl-title"
            onDoubleClick={() => setEditingTitle(true)}
            style={{ cursor: 'grab' }}
          >
            {checklist.title || 'Checklist'}
          </span>
        )}
        <span className="cl-progress">{checkedCount}/{checklist.items.length}</span>
        <button
          className="cl-delete-btn cl-interactive"
          onClick={(e) => { e.stopPropagation(); onDelete(checklist.id); }}
        >✕</button>
      </div>

      <div className="cl-items">
        {checklist.items.map((item) => (
          <div key={item.id} className={`cl-item ${item.checked ? 'checked' : ''}`}>
            <input
              type="checkbox"
              className="cl-checkbox cl-interactive"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
            />
            {editingItemId === item.id ? (
              <input
                className="cl-edit-input cl-interactive"
                value={editItemText}
                onChange={(e) => setEditItemText(e.target.value)}
                onBlur={() => saveEditItem(item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEditItem(item.id); }}
                autoFocus
              />
            ) : (
              <span
                className="cl-item-text cl-interactive"
                onClick={() => startEditItem(item)}
                title="Click để sửa"
                style={{ cursor: 'text' }}
              >
                {item.text}
              </span>
            )}
            <button
              className="cl-item-remove cl-interactive"
              onClick={() => removeItem(item.id)}
            >✕</button>
          </div>
        ))}
      </div>

      <div className="cl-add-row cl-interactive">
        <input
          className="cl-add-input"
          placeholder="Add item…"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
        />
        <button className="cl-add-btn" onClick={addItem}>+</button>
      </div>
    </div>
  );
};

export default ChecklistOverlay;
