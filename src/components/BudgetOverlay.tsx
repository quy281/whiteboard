import React, { useState, useRef, useEffect } from 'react';
import type { BudgetShape, BudgetItem, Viewport } from '../types';
import { generateId } from '../utils';

interface BudgetOverlayProps {
  budgets: BudgetShape[];
  viewport: Viewport;
  onUpdate: (b: BudgetShape) => void;
  onDelete: (id: string) => void;
}

const BudgetOverlay: React.FC<BudgetOverlayProps> = ({
  budgets,
  viewport,
  onUpdate,
  onDelete,
}) => {
  return (
    <div className="budgets-overlay" style={{ pointerEvents: 'none' }}>
      {budgets.map((b) => (
        <BudgetCard
          key={b.id}
          budget={b}
          viewport={viewport}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

/** Format number as VND-style: 1,000,000 */
function formatMoney(n: number): string {
  return n.toLocaleString('vi-VN');
}

function parseMoney(s: string): number {
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const BudgetCard: React.FC<{
  budget: BudgetShape;
  viewport: Viewport;
  onUpdate: (b: BudgetShape) => void;
  onDelete: (id: string) => void;
}> = ({ budget, viewport, onUpdate, onDelete }) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(budget.title);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);

  useEffect(() => {
    setTitle(budget.title);
  }, [budget.title]);

  const screenX = budget.x * viewport.zoom + viewport.x;
  const screenY = budget.y * viewport.zoom + viewport.y;
  const screenW = budget.width * viewport.zoom;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.bg-interactive')) return;
    e.stopPropagation();
    dragRef.current = { ox: e.clientX - screenX, oy: e.clientY - screenY };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const newX = (ev.clientX - dragRef.current.ox - viewport.x) / viewport.zoom;
      const newY = (ev.clientY - dragRef.current.oy - viewport.y) / viewport.zoom;
      onUpdate({ ...budget, x: newX, y: newY });
    };

    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const removeItem = (itemId: string) => {
    const items = budget.items.filter((it) => it.id !== itemId);
    onUpdate({ ...budget, items });
  };

  const addItem = () => {
    if (!newLabel.trim()) return;
    const item: BudgetItem = { id: generateId(), label: newLabel.trim(), amount: parseMoney(newAmount) };
    onUpdate({ ...budget, items: [...budget.items, item] });
    setNewLabel('');
    setNewAmount('');
  };

  const startEditItem = (item: BudgetItem) => {
    setEditingItemId(item.id);
    setEditLabel(item.label);
    setEditAmount(item.amount.toString());
  };

  const saveEditItem = (itemId: string) => {
    const items = budget.items.map((it) =>
      it.id === itemId ? { ...it, label: editLabel, amount: parseMoney(editAmount) } : it
    );
    onUpdate({ ...budget, items });
    setEditingItemId(null);
  };

  const saveTitle = () => {
    setEditingTitle(false);
    onUpdate({ ...budget, title });
  };

  const total = budget.items.reduce((sum, it) => sum + it.amount, 0);

  return (
    <div
      className="budget-card"
      style={{
        left: screenX,
        top: screenY,
        width: screenW,
        background: budget.bgColor,
        fontSize: `${12 * viewport.zoom}px`,
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="bg-header">
        {editingTitle ? (
          <input
            ref={titleRef}
            className="bg-title-input bg-interactive"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); }}
            autoFocus
          />
        ) : (
          <span
            className="bg-title bg-interactive"
            onDoubleClick={() => setEditingTitle(true)}
          >
            💰 {budget.title || 'Ngân sách'}
          </span>
        )}
        <button
          className="bg-delete-btn bg-interactive"
          onClick={(e) => { e.stopPropagation(); onDelete(budget.id); }}
        >✕</button>
      </div>

      {/* Table header */}
      <div className="bg-table-header">
        <span className="bg-col-label">Hạng mục</span>
        <span className="bg-col-amount">Số tiền</span>
        <span className="bg-col-action"></span>
      </div>

      {/* Items */}
      <div className="bg-items">
        {budget.items.map((item) => (
          <div key={item.id} className="bg-item">
            {editingItemId === item.id ? (
              <>
                <input
                  className="bg-edit-input bg-interactive"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditItem(item.id); }}
                  autoFocus
                />
                <input
                  className="bg-edit-amount bg-interactive"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditItem(item.id); }}
                  onBlur={() => saveEditItem(item.id)}
                />
              </>
            ) : (
              <>
                <span
                  className="bg-item-label bg-interactive"
                  onClick={() => startEditItem(item)}
                  title="Click để sửa"
                >
                  {item.label}
                </span>
                <span
                  className="bg-item-amount bg-interactive"
                  onClick={() => startEditItem(item)}
                  title="Click để sửa"
                >
                  {formatMoney(item.amount)}
                </span>
              </>
            )}
            <button
              className="bg-item-remove bg-interactive"
              onClick={() => removeItem(item.id)}
            >✕</button>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bg-total">
        <span className="bg-total-label">Tổng cộng</span>
        <span className="bg-total-amount">{formatMoney(total)}</span>
      </div>

      {/* Add row */}
      <div className="bg-add-row bg-interactive">
        <input
          className="bg-add-label"
          placeholder="Hạng mục…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
        />
        <input
          className="bg-add-amount"
          placeholder="Số tiền…"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
        />
        <button className="bg-add-btn" onClick={addItem}>+</button>
      </div>
    </div>
  );
};

export default BudgetOverlay;
