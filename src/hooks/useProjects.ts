import { useState, useCallback, useEffect, useRef } from 'react';
import type { Project, Board, BoardData, Shape, NoteShape, ChecklistShape, Bookmark, Viewport } from '../types';
import { generateId } from '../utils';

const PROJECTS_KEY = 'wb-projects';
const BOARDS_KEY = 'wb-boards';
const BOARD_DATA_PREFIX = 'wb-bd-';

const PROJECT_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => loadJSON(PROJECTS_KEY, []));
  const [boards, setBoards] = useState<Board[]>(() => loadJSON(BOARDS_KEY, []));

  // Persist
  useEffect(() => { saveJSON(PROJECTS_KEY, projects); }, [projects]);
  useEffect(() => { saveJSON(BOARDS_KEY, boards); }, [boards]);

  // ── Project CRUD ──
  const createProject = useCallback((name: string, description = '') => {
    const project: Project = {
      id: generateId(),
      name,
      description,
      color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      boardIds: [],
    };
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'color'>>) => {
    setProjects((prev) => prev.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    ));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    // Also delete boards of this project
    setBoards((prev) => {
      const toDelete = prev.filter((b) => b.projectId === id);
      toDelete.forEach((b) => localStorage.removeItem(BOARD_DATA_PREFIX + b.id));
      return prev.filter((b) => b.projectId !== id);
    });
  }, []);

  // ── Board CRUD ──
  const createBoard = useCallback((projectId: string, name: string) => {
    const board: Board = {
      id: generateId(),
      projectId,
      name,
      roomId: 'room-' + generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setBoards((prev) => [...prev, board]);
    setProjects((prev) => prev.map((p) =>
      p.id === projectId ? { ...p, boardIds: [...p.boardIds, board.id], updatedAt: Date.now() } : p
    ));
    // Init empty board data
    const emptyData: BoardData = {
      shapes: [], notes: [], checklists: [], bookmarks: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    saveJSON(BOARD_DATA_PREFIX + board.id, emptyData);
    return board;
  }, []);

  const renameBoard = useCallback((id: string, name: string) => {
    setBoards((prev) => prev.map((b) =>
      b.id === id ? { ...b, name, updatedAt: Date.now() } : b
    ));
  }, []);

  const deleteBoard = useCallback((id: string) => {
    const board = boards.find((b) => b.id === id);
    if (board) {
      setProjects((prev) => prev.map((p) =>
        p.id === board.projectId
          ? { ...p, boardIds: p.boardIds.filter((bid) => bid !== id), updatedAt: Date.now() }
          : p
      ));
    }
    setBoards((prev) => prev.filter((b) => b.id !== id));
    localStorage.removeItem(BOARD_DATA_PREFIX + id);
  }, [boards]);

  // ── Board Data ──
  const loadBoardData = useCallback((boardId: string): BoardData => {
    return loadJSON<BoardData>(BOARD_DATA_PREFIX + boardId, {
      shapes: [], notes: [], checklists: [], bookmarks: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  }, []);

  const saveBoardDataRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveBoardData = useCallback((
    boardId: string,
    data: {
      shapes: Shape[];
      notes: NoteShape[];
      checklists: ChecklistShape[];
      bookmarks: Bookmark[];
      viewport: Viewport;
    }
  ) => {
    // Debounced save — 2 seconds
    if (saveBoardDataRef.current) clearTimeout(saveBoardDataRef.current);
    saveBoardDataRef.current = setTimeout(() => {
      saveJSON(BOARD_DATA_PREFIX + boardId, data);
      setBoards((prev) => prev.map((b) =>
        b.id === boardId ? { ...b, updatedAt: Date.now() } : b
      ));
    }, 2000);
  }, []);

  const getBoardsForProject = useCallback((projectId: string) => {
    return boards.filter((b) => b.projectId === projectId);
  }, [boards]);

  const getBoardById = useCallback((boardId: string) => {
    return boards.find((b) => b.id === boardId) ?? null;
  }, [boards]);

  return {
    projects,
    boards,
    createProject,
    updateProject,
    deleteProject,
    createBoard,
    renameBoard,
    deleteBoard,
    loadBoardData,
    saveBoardData,
    getBoardsForProject,
    getBoardById,
  };
}
