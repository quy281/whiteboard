import type { Point, Shape, Viewport } from './types';

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

/** Convert screen coords to canvas (world) coords */
export function screenToWorld(sx: number, sy: number, vp: Viewport): Point {
  return {
    x: (sx - vp.x) / vp.zoom,
    y: (sy - vp.y) / vp.zoom,
  };
}

/** Convert world coords to screen coords */
export function worldToScreen(wx: number, wy: number, vp: Viewport): Point {
  return {
    x: wx * vp.zoom + vp.x,
    y: wy * vp.zoom + vp.y,
  };
}

/** Draw a single shape on the canvas context */
export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, vp: Viewport) {
  // Notes, checklists, and budgets are rendered as HTML overlays, not on canvas
  if (shape.type === 'note' || shape.type === 'checklist' || shape.type === 'budget') return;

  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  ctx.strokeStyle = shape.type === 'eraser' ? '#ffffff' : shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = shape.opacity;

  switch (shape.type) {
    case 'pen':
    case 'eraser': {
      if (shape.points.length < 2) break;
      const pts = shape.points;
      const hasPressure = pts.some(p => p.pressure !== undefined && p.pressure > 0);

      if (hasPressure) {
        // Variable-width stroke based on pressure
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          // Pressure range 0.0..1.0 → lineWidth 0.3x..2.5x
          const pressure = p1.pressure ?? 0.5;
          const w = shape.strokeWidth * (0.3 + pressure * 2.2);
          ctx.lineWidth = w;
          ctx.beginPath();
          if (i === 1) {
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
          } else {
            const prev = pts[i - 2];
            const mid0 = { x: (prev.x + p0.x) / 2, y: (prev.y + p0.y) / 2 };
            const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
            ctx.moveTo(mid0.x, mid0.y);
            ctx.quadraticCurveTo(p0.x, p0.y, mid1.x, mid1.y);
          }
          ctx.stroke();
        }
      } else {
        // Fallback: smooth quadratic curve (no pressure)
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const mid = {
            x: (pts[i - 1].x + pts[i].x) / 2,
            y: (pts[i - 1].y + pts[i].y) / 2,
          };
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mid.x, mid.y);
        }
        ctx.stroke();
      }
      break;
    }
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(shape.start.x, shape.start.y);
      ctx.lineTo(shape.end.x, shape.end.y);
      ctx.stroke();
      break;
    }
    case 'rect': {
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      }
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      break;
    }
    case 'ellipse': {
      ctx.beginPath();
      ctx.ellipse(shape.cx, shape.cy, Math.abs(shape.rx), Math.abs(shape.ry), 0, 0, Math.PI * 2);
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
    case 'text': {
      ctx.font = `${shape.fontSize}px Inter, sans-serif`;
      ctx.fillStyle = shape.color;
      ctx.fillText(shape.content, shape.x, shape.y);
      break;
    }
  }

  ctx.restore();
}

/** Random color from a curated palette */
const CURSOR_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3',
  '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0',
  '#ff6348', '#2ed573', '#1e90ff', '#ff4757',
];

export function randomColor(): string {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

export function randomName(): string {
  const adj = ['Swift', 'Bright', 'Cool', 'Quick', 'Bold', 'Calm', 'Sharp', 'Wise'];
  const nouns = ['Fox', 'Eagle', 'Tiger', 'Bear', 'Wolf', 'Hawk', 'Lion', 'Owl'];
  return `${adj[Math.floor(Math.random() * adj.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

/** Get or create room ID from URL hash */
export function getRoomId(): string {
  let hash = window.location.hash.slice(1);
  if (!hash) {
    hash = 'room-' + generateId();
    window.location.hash = hash;
  }
  return hash;
}
