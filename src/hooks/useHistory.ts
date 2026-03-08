import { useCallback, useRef } from 'react';
import type { Shape } from '../types';

export function useHistory(
  shapes: Shape[],
  setShapes: (shapes: Shape[]) => void
) {
  const undoStack = useRef<Shape[][]>([]);
  const redoStack = useRef<Shape[][]>([]);

  const pushToHistory = useCallback(() => {
    undoStack.current.push([...shapes]);
    redoStack.current = [];
  }, [shapes]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push([...shapes]);
    setShapes(prev);
  }, [shapes, setShapes]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push([...shapes]);
    setShapes(next);
  }, [shapes, setShapes]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return { pushToHistory, undo, redo, canUndo, canRedo };
}
