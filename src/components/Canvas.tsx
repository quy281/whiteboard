import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Shape, Tool, Viewport, Point } from '../types';
import { drawShape, screenToWorld, generateId } from '../utils';
import { usePenSound } from '../hooks/usePenSound';

interface CanvasProps {
  shapes: Shape[];
  tool: Tool;
  color: string;
  strokeWidth: number;
  viewport: Viewport;
  onViewportChange: (vp: Viewport) => void;
  onShapeAdd: (shape: Shape) => void;
  onShapeUpdate: (shape: Shape) => void;
  onShapeComplete: () => void;
  onShapeMove?: (id: string, dx: number, dy: number) => void;
  onCursorMove: (x: number, y: number) => void;
  cursors: Array<{ id: string; name: string; color: string; x: number; y: number }>;
}

const Canvas: React.FC<CanvasProps> = ({
  shapes,
  tool,
  color,
  strokeWidth,
  viewport,
  onViewportChange,
  onShapeAdd,
  onShapeUpdate,
  onShapeComplete,
  onShapeMove,
  onCursorMove,
  cursors,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentShape = useRef<Shape | null>(null);
  const panStart = useRef<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const lastPointer = useRef<{ x: number; y: number; time: number } | null>(null);
  // For select/drag
  const draggingShape = useRef<{ id: string; startWorldX: number; startWorldY: number; pointerStartX: number; pointerStartY: number } | null>(null);
  const selectedShapeId = useRef<string | null>(null);

  // Pen sound
  const { startSound, updateSound, stopSound } = usePenSound();

  // Pinch-to-zoom state
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchMid = useRef<Point | null>(null);
  const isPinching = useRef(false);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;

    const obs = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    });
    obs.observe(parent);
    return () => obs.disconnect();
  }, []);

  // Keep refs in sync for rAF access (avoid stale closures)
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const cursorsRef = useRef(cursors);
  cursorsRef.current = cursors;
  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;

  const needsRedraw = useRef(true);
  const rafId = useRef(0);

  // Mark redraw needed when dependencies change
  useEffect(() => {
    needsRedraw.current = true;
  }, [shapes, viewport, canvasSize, cursors]);

  // requestAnimationFrame render loop
  useEffect(() => {
    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafId.current = requestAnimationFrame(renderFrame);
        return;
      }

      // Only redraw when needed or actively drawing
      if (!needsRedraw.current && !isDrawing.current) {
        rafId.current = requestAnimationFrame(renderFrame);
        return;
      }
      needsRedraw.current = false;

      const ctx = canvas.getContext('2d')!;
      const cs = canvasSizeRef.current;
      const vp = viewportRef.current;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = cs.width * dpr;
      canvas.height = cs.height * dpr;
      canvas.style.width = `${cs.width}px`;
      canvas.style.height = `${cs.height}px`;
      ctx.scale(dpr, dpr);

      // Clear — white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cs.width, cs.height);

      // Grid
      drawGrid(ctx, vp, cs.width, cs.height);

      // Draw shapes
      for (const shape of shapesRef.current) {
        drawShape(ctx, shape, vp);
      }

      // Draw current shape being drawn
      if (currentShape.current) {
        drawShape(ctx, currentShape.current, vp);
      }

      // Draw remote cursors
      for (const cursor of cursorsRef.current) {
        drawCursor(ctx, cursor, vp);
      }

      rafId.current = requestAnimationFrame(renderFrame);
    };

    rafId.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId.current);
  }, []); // runs once, loops via rAF

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, vp: Viewport, w: number, h: number) => {
      const gridSize = 40 * vp.zoom;
      if (gridSize < 8) return;

      ctx.strokeStyle = `rgba(0, 0, 0, ${Math.min(0.08, gridSize / 600)})`;
      ctx.lineWidth = 1;

      const offsetX = vp.x % gridSize;
      const offsetY = vp.y % gridSize;

      ctx.beginPath();
      for (let x = offsetX; x < w; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = offsetY; y < h; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    },
    []
  );

  const drawCursor = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cursor: { name: string; color: string; x: number; y: number },
      vp: Viewport
    ) => {
      const sx = cursor.x * vp.zoom + vp.x;
      const sy = cursor.y * vp.zoom + vp.y;

      // Cursor arrow
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(5, 14);
      ctx.lineTo(12, 22);
      ctx.lineTo(15, 19);
      ctx.lineTo(8, 11);
      ctx.lineTo(14, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Name tag
      ctx.font = '11px Inter, sans-serif';
      const tw = ctx.measureText(cursor.name).width;
      const pad = 6;
      ctx.fillStyle = cursor.color;
      ctx.globalAlpha = 0.9;
      const rx = 14;
      const ry = 20;
      ctx.beginPath();
      ctx.roundRect(rx, ry, tw + pad * 2, 20, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillText(cursor.name, rx + pad, ry + 14);
      ctx.restore();
    },
    []
  );

  // Hit-test a world point against shapes (returns topmost matching shape id)
  const hitTestShape = useCallback((wx: number, wy: number): Shape | null => {
    const allShapes = shapesRef.current;
    for (let i = allShapes.length - 1; i >= 0; i--) {
      const s = allShapes[i];
      const pad = 10; // hit padding in world units
      if (s.type === 'text') {
        // Approximate text bounding box
        const fw = s.fontSize * 0.6 * s.content.length;
        const fh = s.fontSize;
        if (wx >= s.x - pad && wx <= s.x + fw + pad && wy >= s.y - fh - pad && wy <= s.y + pad) return s;
      } else if (s.type === 'rect') {
        const x0 = Math.min(s.x, s.x + s.width);
        const x1 = Math.max(s.x, s.x + s.width);
        const y0 = Math.min(s.y, s.y + s.height);
        const y1 = Math.max(s.y, s.y + s.height);
        if (wx >= x0 - pad && wx <= x1 + pad && wy >= y0 - pad && wy <= y1 + pad) return s;
      } else if (s.type === 'ellipse') {
        const dx = (wx - s.cx) / (Math.abs(s.rx) + pad);
        const dy = (wy - s.cy) / (Math.abs(s.ry) + pad);
        if (dx * dx + dy * dy <= 1.2) return s;
      } else if (s.type === 'line') {
        // Distance from point to line segment
        const lx = s.end.x - s.start.x;
        const ly = s.end.y - s.start.y;
        const len2 = lx * lx + ly * ly;
        if (len2 === 0) continue;
        const t = Math.max(0, Math.min(1, ((wx - s.start.x) * lx + (wy - s.start.y) * ly) / len2));
        const px = s.start.x + t * lx - wx;
        const py = s.start.y + t * ly - wy;
        if (Math.sqrt(px * px + py * py) <= s.strokeWidth / 2 + pad) return s;
      }
    }
    return null;
  }, []);

  // Mouse handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Skip drawing if pinching (multi-touch zoom/pan)
      if (isPinching.current) return;

      const canvas = canvasRef.current!;
      canvas.setPointerCapture(e.pointerId);

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy, viewport);

      if (tool === 'pan' || e.button === 1) {
        panStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
        return;
      }

      // Select tool — hit-test and start dragging
      if (tool === 'select') {
        const hit = hitTestShape(world.x, world.y);
        if (hit) {
          selectedShapeId.current = hit.id;
          const startX = hit.type === 'text' || hit.type === 'rect' ? hit.x :
            hit.type === 'ellipse' ? hit.cx :
              hit.type === 'line' ? hit.start.x : 0;
          const startY = hit.type === 'text' || hit.type === 'rect' ? hit.y :
            hit.type === 'ellipse' ? hit.cy :
              hit.type === 'line' ? hit.start.y : 0;
          draggingShape.current = {
            id: hit.id,
            startWorldX: startX,
            startWorldY: startY,
            pointerStartX: world.x,
            pointerStartY: world.y,
          };
        } else {
          selectedShapeId.current = null;
          draggingShape.current = null;
        }
        return;
      }

      isDrawing.current = true;


      const base = {
        id: generateId(),
        color,
        strokeWidth,
        opacity: 1,
      };

      switch (tool) {
        case 'pen': {
          const p: Point = { ...world, pressure: e.pressure > 0 ? e.pressure : 0.5 };
          currentShape.current = { ...base, type: 'pen', points: [p] };
          startSound();
          break;
        }
        case 'eraser':
          currentShape.current = {
            ...base,
            type: 'eraser',
            points: [world],
            strokeWidth: strokeWidth * 3,
          };
          break;
        case 'line':
          currentShape.current = { ...base, type: 'line', start: world, end: world };
          break;
        case 'rect':
          currentShape.current = {
            ...base,
            type: 'rect',
            x: world.x,
            y: world.y,
            width: 0,
            height: 0,
          };
          break;
        case 'ellipse':
          currentShape.current = {
            ...base,
            type: 'ellipse',
            cx: world.x,
            cy: world.y,
            rx: 0,
            ry: 0,
          };
          break;
        case 'text': {
          const content = prompt('Enter text:');
          if (content) {
            const textShape: Shape = {
              ...base,
              type: 'text',
              x: world.x,
              y: world.y,
              content,
              fontSize: strokeWidth * 4 + 12,
            };
            onShapeAdd(textShape);
            onShapeComplete();
          }
          isDrawing.current = false;
          break;
        }
      }
    },
    [tool, color, strokeWidth, viewport, onShapeAdd, onShapeComplete]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Skip if pinching
      if (isPinching.current) return;

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy, viewport);

      onCursorMove(world.x, world.y);

      // Pan
      if (panStart.current) {
        onViewportChange({
          ...viewport,
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
        return;
      }

      // Drag selected shape
      if (draggingShape.current && onShapeMove) {
        const dx = world.x - draggingShape.current.pointerStartX;
        const dy = world.y - draggingShape.current.pointerStartY;
        onShapeMove(draggingShape.current.id, draggingShape.current.startWorldX + dx, draggingShape.current.startWorldY + dy);
        needsRedraw.current = true;
        return;
      }

      if (!isDrawing.current || !currentShape.current) return;

      const shape = currentShape.current;

      switch (shape.type) {
        case 'pen': {
          const p: Point = { ...world, pressure: e.pressure > 0 ? e.pressure : 0.5 };
          shape.points.push(p);
          // Calculate speed for sound modulation
          const now = performance.now();
          if (lastPointer.current) {
            const dx = e.clientX - lastPointer.current.x;
            const dy = e.clientY - lastPointer.current.y;
            const dt = now - lastPointer.current.time;
            const speed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 1);
            updateSound(speed, e.pressure || 0.5);
          }
          lastPointer.current = { x: e.clientX, y: e.clientY, time: now };
          break;
        }
        case 'eraser':
          shape.points.push(world);
          break;
        case 'line':
          shape.end = world;
          break;
        case 'rect':
          shape.width = world.x - shape.x;
          shape.height = world.y - shape.y;
          break;
        case 'ellipse':
          shape.rx = world.x - shape.cx;
          shape.ry = world.y - shape.cy;
          break;
      }

      onShapeUpdate({ ...shape });
    },
    [viewport, onViewportChange, onShapeUpdate, onCursorMove, onShapeMove]
  );

  const handlePointerUp = useCallback(() => {
    if (panStart.current) {
      panStart.current = null;
      return;
    }

    // Finish drag
    if (draggingShape.current) {
      draggingShape.current = null;
      return;
    }

    if (isDrawing.current && currentShape.current) {
      onShapeAdd(currentShape.current);
      onShapeComplete();
      currentShape.current = null;
    }
    isDrawing.current = false;
    lastPointer.current = null;
    stopSound();
  }, [onShapeAdd, onShapeComplete, stopSound]);

  // Zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.01), 100);

      const wx = (mx - viewport.x) / viewport.zoom;
      const wy = (my - viewport.y) / viewport.zoom;

      onViewportChange({
        zoom: newZoom,
        x: mx - wx * newZoom,
        y: my - wy * newZoom,
      });
    },
    [viewport, onViewportChange]
  );

  const cursorStyle = (): string => {
    switch (tool) {
      case 'pen':
        return 'crosshair';
      case 'eraser':
        return 'cell';
      case 'pan':
        return 'grab';
      case 'text':
        return 'text';
      case 'select':
        return selectedShapeId.current ? 'move' : 'default';
      default:
        return 'crosshair';
    }
  };

  // Pinch-to-zoom touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      isPinching.current = true;

      // Cancel any in-progress drawing
      if (isDrawing.current && currentShape.current) {
        currentShape.current = null;
        isDrawing.current = false;
      }

      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchMid.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDist.current !== null && lastTouchMid.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };

        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const mx = mid.x - rect.left;
        const my = mid.y - rect.top;

        const scale = dist / lastTouchDist.current;
        const newZoom = Math.min(Math.max(viewport.zoom * scale, 0.01), 100);

        const wx = (mx - viewport.x) / viewport.zoom;
        const wy = (my - viewport.y) / viewport.zoom;

        // pan delta
        const panDx = mid.x - lastTouchMid.current.x;
        const panDy = mid.y - lastTouchMid.current.y;

        onViewportChange({
          zoom: newZoom,
          x: mx - wx * newZoom + panDx,
          y: my - wy * newZoom + panDy,
        });

        lastTouchDist.current = dist;
        lastTouchMid.current = mid;
      }
    },
    [viewport, onViewportChange]
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      // Small delay before allowing drawing again to prevent accidental strokes
      setTimeout(() => {
        isPinching.current = false;
      }, 100);
      lastTouchDist.current = null;
      lastTouchMid.current = null;
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: cursorStyle(),
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};

export default Canvas;
