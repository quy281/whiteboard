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
  // Notes and checklists are rendered as HTML overlays, not on canvas
  if (shape.type === 'note' || shape.type === 'checklist') return;

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
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        const mid = {
          x: (shape.points[i - 1].x + shape.points[i].x) / 2,
          y: (shape.points[i - 1].y + shape.points[i].y) / 2,
        };
        ctx.quadraticCurveTo(shape.points[i - 1].x, shape.points[i - 1].y, mid.x, mid.y);
      }
      ctx.stroke();
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
