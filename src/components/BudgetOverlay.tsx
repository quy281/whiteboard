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

/**
 * Parse money string with Vietnamese shorthands:
 *  5k  → 5,000       15k  → 15,000
 *  5tr → 5,000,000   15tr → 15,000,000
 */
function parseMoney(s: string): number {
  const trimmed = s.trim().toLowerCase();
  // Match number followed by optional suffix
  const match = trimmed.match(/^([0-9]*\.?[0-9]+)\s*(tr|t|k|m)?$/);
  if (!match) {
    const cleaned = trimmed.replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  const suffix = match[2];
  if (suffix === 'k') return num * 1000;
  if (suffix === 'tr' || suffix === 't') return num * 1000000;
  if (suffix === 'm') return num * 1000000;
  return num;
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

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;
    if (target.closest('.bg-interactive')) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { ox: e.clientX - screenX, oy: e.clientY - screenY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const newX = (e.clientX - dragRef.current.ox - viewport.x) / viewport.zoom;
    const newY = (e.clientY - dragRef.current.oy - viewport.y) / viewport.zoom;
    onUpdate({ ...budget, x: newX, y: newY });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
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
        touchAction: 'none',
        cursor: 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
            className="bg-title"
            onDoubleClick={() => setEditingTitle(true)}
            style={{ cursor: 'grab' }}
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
