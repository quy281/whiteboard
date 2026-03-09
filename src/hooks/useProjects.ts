import { useState, useCallback, useEffect, useRef } from 'react';
import type { Project, Board, BoardData, Shape, NoteShape, ChecklistShape, BudgetShape, Bookmark, Viewport } from '../types';
import { supabase } from '../supabaseClient';
import { generateId } from '../utils';

const PROJECT_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

// ── localStorage helpers ──
const LS_PROJECTS_KEY = 'wb-projects';
const LS_BOARDS_KEY = 'wb-boards';
const LS_BOARD_DATA_PREFIX = 'wb-board-data-';

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export function useProjects(userId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Persist to localStorage whenever state changes
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const boardsRef = useRef(boards);
  boardsRef.current = boards;

  useEffect(() => {
    if (projects.length > 0) lsSet(LS_PROJECTS_KEY, projects);
  }, [projects]);

  useEffect(() => {
    if (boards.length > 0) lsSet(LS_BOARDS_KEY, boards);
  }, [boards]);

  // Load data: localStorage first (instant), then Supabase (merge)
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    // 1) Load from localStorage instantly
    const cachedProjects = lsGet<Project[]>(LS_PROJECTS_KEY, []);
    const cachedBoards = lsGet<Board[]>(LS_BOARDS_KEY, []);
    if (cachedProjects.length > 0 || cachedBoards.length > 0) {
      setProjects(cachedProjects);
      setBoards(cachedBoards);
      setIsLoading(false);
    }

    // 2) Try loading from Supabase (may fail if offline)
    const loadRemote = async () => {
      try {
        const [pRes, bRes] = await Promise.all([
          supabase.from('projects').select('*').order('updated_at', { ascending: false }),
          supabase.from('boards').select('*'),
        ]);

        let allProjects: Project[] = [];
        let allBoards: Board[] = [];

        if (pRes.data) {
          allProjects = pRes.data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.user_id === userId ? (p.name as string) : '🤝 ' + (p.name as string),
            description: (p.description as string) || '',
            color: (p.color as string) || '#6366f1',
            createdAt: p.created_at as number,
            updatedAt: p.updated_at as number,
            boardIds: [],
          }));
        }

        if (bRes.data) {
          allBoards = bRes.data.map((b: Record<string, unknown>) => ({
            id: b.id as string,
            projectId: b.project_id as string,
            name: b.name as string,
            roomId: b.room_id as string,
            password: (b.password as string) || undefined,
            createdAt: b.created_at as number,
            updatedAt: b.updated_at as number,
          }));
        }

        // Rebuild boardIds
        allProjects = allProjects.map(p => ({
          ...p,
          boardIds: allBoards.filter((b: Board) => b.projectId === p.id).map((b: Board) => b.id),
        }));

        if (allProjects.length > 0 || allBoards.length > 0) {
          setProjects(allProjects);
          setBoards(allBoards);
        }
        setIsLoading(false);
      } catch (err) {
        console.warn('[useProjects] Supabase fetch failed (offline?):', err);
        setIsLoading(false);
      }
    };

    loadRemote();
  }, [userId]);

  // ── Project CRUD ──
  const createProject = useCallback(async (name: string, description = '') => {
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

    if (userId && navigator.onLine) {
      try {
        await supabase.from('projects').insert({
          id: project.id,
          user_id: userId,
          name: project.name,
          description: project.description,
          color: project.color,
          created_at: project.createdAt,
          updated_at: project.updatedAt,
        });
      } catch { /* offline, already in localStorage */ }
    }

    return project;
  }, [userId]);

  const updateProject = useCallback(async (id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'color'>>) => {
    setProjects((prev) => prev.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    ));

    if (userId && navigator.onLine) {
      try {
        await supabase.from('projects').update({
          ...updates,
          updated_at: Date.now(),
        }).eq('id', id);
      } catch { /* offline */ }
    }
  }, [userId]);

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setBoards((prev) => prev.filter((b) => b.projectId !== id));

    if (userId && navigator.onLine) {
      try {
        await supabase.from('projects').delete().eq('id', id);
      } catch { /* offline */ }
    }
  }, [userId]);

  // ── Board CRUD ──
  const createBoard = useCallback(async (projectId: string, name: string, customRoomId?: string, password?: string) => {
    const board: Board = {
      id: generateId(),
      projectId,
      name,
      roomId: customRoomId?.trim() || ('room-' + generateId()),
      password: password?.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setBoards((prev) => [...prev, board]);
    setProjects((prev) => prev.map((p) =>
      p.id === projectId ? { ...p, boardIds: [...p.boardIds, board.id], updatedAt: Date.now() } : p
    ));

    if (userId && navigator.onLine) {
      try {
        await supabase.from('boards').insert({
          id: board.id,
          project_id: board.projectId,
          user_id: userId,
          name: board.name,
          room_id: board.roomId,
          password: board.password || null,
          created_at: board.createdAt,
          updated_at: board.updatedAt,
        });

        // Init empty board data
        await supabase.from('board_data').insert({
          board_id: board.id,
          user_id: userId,
          data: { shapes: [], notes: [], checklists: [], budgets: [], bookmarks: [], viewport: { x: 0, y: 0, zoom: 1 } },
          updated_at: Date.now(),
        });
      } catch { /* offline */ }
    }

    return board;
  }, [userId]);

  const renameBoard = useCallback(async (id: string, name: string) => {
    setBoards((prev) => prev.map((b) =>
      b.id === id ? { ...b, name, updatedAt: Date.now() } : b
    ));

    if (userId && navigator.onLine) {
      try {
        await supabase.from('boards').update({ name, updated_at: Date.now() }).eq('id', id);
      } catch { /* offline */ }
    }
  }, [userId]);

  const deleteBoard = useCallback(async (id: string) => {
    const board = boardsRef.current.find((b) => b.id === id);
    if (board) {
      setProjects((prev) => prev.map((p) =>
        p.id === board.projectId
          ? { ...p, boardIds: p.boardIds.filter((bid) => bid !== id), updatedAt: Date.now() }
          : p
      ));
    }
    setBoards((prev) => prev.filter((b) => b.id !== id));

    // Clean up localStorage board data
    try { localStorage.removeItem(LS_BOARD_DATA_PREFIX + id); } catch { /* ignore */ }

    if (userId && navigator.onLine) {
      try {
        await supabase.from('boards').delete().eq('id', id);
      } catch { /* offline */ }
    }
  }, [userId]);

  // ── Board Data ──
  const loadBoardData = useCallback(async (boardId: string): Promise<BoardData> => {
    const empty: BoardData = {
      shapes: [], notes: [], checklists: [], budgets: [], bookmarks: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    // 1) Try localStorage first (instant)
    const cached = lsGet<BoardData | null>(LS_BOARD_DATA_PREFIX + boardId, null);

    if (!userId || !navigator.onLine) {
      return cached || empty;
    }

    // 2) Try Supabase
    try {
      const { data } = await supabase
        .from('board_data')
        .select('data')
        .eq('board_id', boardId)
        .single();

      if (data?.data) {
        const d = data.data as Record<string, unknown>;
        const boardData: BoardData = {
          shapes: (d.shapes as Shape[]) || [],
          notes: (d.notes as NoteShape[]) || [],
          checklists: (d.checklists as ChecklistShape[]) || [],
          budgets: (d.budgets as BudgetShape[]) || [],
          bookmarks: (d.bookmarks as Bookmark[]) || [],
          viewport: (d.viewport as Viewport) || { x: 0, y: 0, zoom: 1 },
        };
        // Update localStorage cache
        lsSet(LS_BOARD_DATA_PREFIX + boardId, boardData);
        return boardData;
      }
    } catch {
      // Supabase failed — use cached
    }

    return cached || empty;
  }, [userId]);

  const saveBoardDataRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveBoardData = useCallback((
    boardId: string,
    data: {
      shapes: Shape[];
      notes: NoteShape[];
      checklists: ChecklistShape[];
      budgets: BudgetShape[];
      bookmarks: Bookmark[];
      viewport: Viewport;
    }
  ) => {
    // Always save to localStorage immediately
    lsSet(LS_BOARD_DATA_PREFIX + boardId, data);

    if (!userId) return;

    // Debounced save to Supabase — 3 seconds
    if (saveBoardDataRef.current) clearTimeout(saveBoardDataRef.current);
    saveBoardDataRef.current = setTimeout(async () => {
      if (!navigator.onLine) return; // Skip Supabase if offline

      try {
        await supabase.from('board_data').upsert({
          board_id: boardId,
          user_id: userId,
          data,
          updated_at: Date.now(),
        });

        setBoards((prev) => prev.map((b) =>
          b.id === boardId ? { ...b, updatedAt: Date.now() } : b
        ));
      } catch {
        // offline or error — data is still safe in localStorage
      }
    }, 3000);
  }, [userId]);

  const getBoardsForProject = useCallback((projectId: string) => {
    return boards.filter((b) => b.projectId === projectId);
  }, [boards]);

  const getBoardById = useCallback((boardId: string) => {
    return boards.find((b) => b.id === boardId) ?? null;
  }, [boards]);

  const getRecentBoards = useCallback((limit = 5) => {
    return [...boards]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }, [boards]);

  return {
    projects,
    boards,
    isLoading,
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
    getRecentBoards,
  };
}
