// ── Tool Types ──────────────────────────────────────────────
export type Tool =
  | 'pen'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'eraser'
  | 'text'
  | 'note'
  | 'checklist'
  | 'select'
  | 'pan';

// ── Shape Types ─────────────────────────────────────────────
export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BaseShape {
  id: string;
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface PenStroke extends BaseShape {
  type: 'pen';
  points: Point[];
}

export interface LineShape extends BaseShape {
  type: 'line';
  start: Point;
  end: Point;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill?: string;
}

export interface TextShape extends BaseShape {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

export interface EraserStroke extends BaseShape {
  type: 'eraser';
  points: Point[];
}

export type Shape =
  | PenStroke
  | LineShape
  | RectShape
  | EllipseShape
  | TextShape
  | EraserStroke
  | NoteShape
  | ChecklistShape;

// ── Note ────────────────────────────────────────────────────
export interface NoteShape {
  type: 'note';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  bgColor: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistShape {
  type: 'checklist';
  id: string;
  x: number;
  y: number;
  width: number;
  title: string;
  items: ChecklistItem[];
  bgColor: string;
}

// ── Viewport ────────────────────────────────────────────────
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ── Collaboration ───────────────────────────────────────────
export interface UserCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export interface UserInfo {
  id: string;
  name: string;
  color: string;
}

// ── Bookmarks / Pins ────────────────────────────────────────
export interface Bookmark {
  id: string;
  name: string;
  x: number;
  y: number;
  zoom: number;
}

// ── App State ───────────────────────────────────────────────
export interface AppState {
  tool: Tool;
  color: string;
  strokeWidth: number;
  shapes: Shape[];
  viewport: Viewport;
  selectedIds: string[];
  bookmarks: Bookmark[];
}
