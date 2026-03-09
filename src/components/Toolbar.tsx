import React, { useState, useRef, useEffect } from 'react';
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
  onBack?: () => void;
  position: 'top' | 'bottom';
}

const TOOLS: { key: Tool; icon: string; label: string }[] = [
  { key: 'select', icon: '↖️', label: 'Chọn & Di chuyển' },
  { key: 'pen', icon: '✏️', label: 'Pen' },
  { key: 'line', icon: '╱', label: 'Line' },
  { key: 'rect', icon: '▭', label: 'Rect' },
  { key: 'ellipse', icon: '◯', label: 'Ellipse' },
  { key: 'text', icon: 'T', label: 'Text' },
  { key: 'note', icon: '📝', label: 'Note' },
  { key: 'checklist', icon: '☑️', label: 'List' },
  { key: 'budget', icon: '💰', label: 'Budget' },
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
  onBack,
  position,
}) => {
  const [showColors, setShowColors] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  // Close color popup when clicking/touching outside
  useEffect(() => {
    if (!showColors) return;
    const handleClick = (e: PointerEvent | TouchEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
    };
    // Use pointerdown for unified mouse+touch support
    document.addEventListener('pointerdown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('pointerdown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [showColors]);

  if (position === 'top') {
    // Top: only drawing tools
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

  // position === 'bottom' — back + color picker + stroke + undo/redo/clear
  return (
    <div className="toolbar toolbar-bottom">
      {/* Back button */}
      {onBack && (
        <>
          <button className="tool-btn tool-btn-compact back-btn" onClick={onBack} title="Quay lại">
            ◀
          </button>
          <div className="toolbar-divider toolbar-divider-compact" />
        </>
      )}

      {/* Color picker toggle */}
      <div className="color-picker-wrapper" ref={colorRef}>
        <button
          className="color-swatch-btn"
          onPointerDown={(e) => { e.stopPropagation(); }}
          onTouchStart={(e) => { e.stopPropagation(); }}
          onClick={() => setShowColors(!showColors)}
          title="Chọn màu"
        >
          <span className="color-swatch-circle" style={{ background: color }} />
          <span className="color-swatch-arrow">{showColors ? '▾' : '▴'}</span>
        </button>

        {showColors && (
          <div className="color-popup">
            <div className="color-popup-grid">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-btn color-btn-popup ${color === c ? 'active' : ''}`}
                  style={{ '--swatch-color': c } as React.CSSProperties}
                  onClick={() => { onColorChange(c); setShowColors(false); }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}
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
