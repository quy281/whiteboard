import React from 'react';
import type { Tool } from '../types';

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  position: 'top' | 'bottom';
}

const TOOLS: { key: Tool; icon: string; label: string }[] = [
  { key: 'pen', icon: '✏️', label: 'Pen' },
  { key: 'line', icon: '╱', label: 'Line' },
  { key: 'rect', icon: '▭', label: 'Rect' },
  { key: 'ellipse', icon: '◯', label: 'Ellipse' },
  { key: 'text', icon: 'T', label: 'Text' },
  { key: 'note', icon: '📝', label: 'Note' },
  { key: 'checklist', icon: '☑️', label: 'List' },
  { key: 'eraser', icon: '🧹', label: 'Eraser' },
  { key: 'pan', icon: '🤚', label: 'Pan' },
];

const COLORS = [
  '#1e293b', '#ff6b6b', '#feca57', '#48dbfb',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4',
  '#2ed573', '#ff6348', '#f368e0', '#1e90ff',
];

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  position,
}) => {
  if (position === 'top') {
    return (
      <div className="toolbar-section tools-row">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            className={`tool-btn tool-btn-compact ${tool === t.key ? 'active' : ''}`}
            onClick={() => onToolChange(t.key)}
            title={t.label}
          >
            <span className="tool-icon">{t.icon}</span>
          </button>
        ))}
      </div>
    );
  }

  // position === 'bottom'
  return (
    <div className="toolbar toolbar-bottom">
      {/* Colors */}
      <div className="toolbar-section colors colors-compact">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`color-btn color-btn-compact ${color === c ? 'active' : ''}`}
            style={{ '--swatch-color': c } as React.CSSProperties}
            onClick={() => onColorChange(c)}
            title={c}
          />
        ))}
      </div>

      <div className="toolbar-divider toolbar-divider-compact" />

      {/* Stroke Width */}
      <div className="toolbar-section stroke-section">
        <div
          className="stroke-preview"
          style={{
            width: strokeWidth * 2 + 4,
            height: strokeWidth * 2 + 4,
            background: color,
          }}
        />
        <input
          type="range"
          className="stroke-slider"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
        />
      </div>

      <div className="toolbar-divider toolbar-divider-compact" />

      {/* Undo / Redo / Clear */}
      <div className="toolbar-section">
        <button className="tool-btn tool-btn-compact" onClick={onUndo} disabled={!canUndo} title="Undo">
          ↩️
        </button>
        <button className="tool-btn tool-btn-compact" onClick={onRedo} disabled={!canRedo} title="Redo">
          ↪️
        </button>
        <button className="tool-btn tool-btn-compact danger" onClick={onClear} title="Clear">
          🗑️
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
