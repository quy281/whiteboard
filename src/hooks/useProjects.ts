import { useState, useCallback, useEffect, useRef } from 'react';
import type { Project, Board, BoardData, Shape, NoteShape, ChecklistShape, Bookmark, Viewport } from '../types';
import { supabase } from '../supabaseClient';
import { generateId } from '../utils';

const PROJECT_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

export function useProjects(userId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase on mount (owned + shared)
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    const load = async () => {
      // Load owned projects
      const [pRes, bRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
        supabase.from('boards').select('*').eq('user_id', userId),
      ]);

      let allProjects: Project[] = [];
      let allBoards: Board[] = [];

      if (pRes.data) {
        allProjects = pRes.data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
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
          createdAt: b.created_at as number,
          updatedAt: b.updated_at as number,
        }));
      }

      // Load shared projects (via project_members)
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        const sharedProjectIds = memberships.map((m: { project_id: string }) => m.project_id);

        const [spRes, sbRes] = await Promise.all([
          supabase.from('projects').select('*').in('id', sharedProjectIds),
          supabase.from('boards').select('*').in('project_id', sharedProjectIds),
        ]);

        if (spRes.data) {
          const sharedProjects = spRes.data
            .filter((p: Record<string, unknown>) => !allProjects.some(ap => ap.id === p.id))
            .map((p: Record<string, unknown>) => ({
              id: p.id as string,
              name: '🤝 ' + (p.name as string),
              description: (p.description as string) || '',
              color: (p.color as string) || '#6366f1',
              createdAt: p.created_at as number,
              updatedAt: p.updated_at as number,
              boardIds: [],
            }));
          allProjects = [...allProjects, ...sharedProjects];
        }

        if (sbRes.data) {
          const sharedBoards = sbRes.data
            .filter((b: Record<string, unknown>) => !allBoards.some(ab => ab.id === b.id))
            .map((b: Record<string, unknown>) => ({
              id: b.id as string,
              projectId: b.project_id as string,
              name: b.name as string,
              roomId: b.room_id as string,
              createdAt: b.created_at as number,
              updatedAt: b.updated_at as number,
            }));
          allBoards = [...allBoards, ...sharedBoards];
        }
      }

      // Rebuild boardIds
      allProjects = allProjects.map(p => ({
        ...p,
        boardIds: allBoards.filter((b: Board) => b.projectId === p.id).map((b: Board) => b.id),
      }));

      setProjects(allProjects);
      setBoards(allBoards);
      setIsLoading(false);
    };
    load();
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

    if (userId) {
      await supabase.from('projects').insert({
        id: project.id,
        user_id: userId,
        name: project.name,
        description: project.description,
        color: project.color,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
      });
    }

    return project;
  }, [userId]);

  const updateProject = useCallback(async (id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'color'>>) => {
    setProjects((prev) => prev.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    ));

    if (userId) {
      await supabase.from('projects').update({
        ...updates,
        updated_at: Date.now(),
      }).eq('id', id);
    }
  }, [userId]);

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setBoards((prev) => prev.filter((b) => b.projectId !== id));

    if (userId) {
      await supabase.from('projects').delete().eq('id', id);
    }
  }, [userId]);

  // ── Board CRUD ──
  const createBoard = useCallback(async (projectId: string, name: string) => {
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

    if (userId) {
      await supabase.from('boards').insert({
        id: board.id,
        project_id: board.projectId,
        user_id: userId,
        name: board.name,
        room_id: board.roomId,
        created_at: board.createdAt,
        updated_at: board.updatedAt,
      });

      // Init empty board data
      await supabase.from('board_data').insert({
        board_id: board.id,
        user_id: userId,
        data: { shapes: [], notes: [], checklists: [], bookmarks: [], viewport: { x: 0, y: 0, zoom: 1 } },
        updated_at: Date.now(),
      });
    }

    return board;
  }, [userId]);

  const renameBoard = useCallback(async (id: string, name: string) => {
    setBoards((prev) => prev.map((b) =>
      b.id === id ? { ...b, name, updatedAt: Date.now() } : b
    ));

    if (userId) {
      await supabase.from('boards').update({ name, updated_at: Date.now() }).eq('id', id);
    }
  }, [userId]);

  const deleteBoard = useCallback(async (id: string) => {
    const board = boards.find((b) => b.id === id);
    if (board) {
      setProjects((prev) => prev.map((p) =>
        p.id === board.projectId
          ? { ...p, boardIds: p.boardIds.filter((bid) => bid !== id), updatedAt: Date.now() }
          : p
      ));
    }
    setBoards((prev) => prev.filter((b) => b.id !== id));

    if (userId) {
      await supabase.from('boards').delete().eq('id', id);
    }
  }, [userId, boards]);

  // ── Board Data ──
  const loadBoardData = useCallback(async (boardId: string): Promise<BoardData> => {
    const empty: BoardData = {
      shapes: [], notes: [], checklists: [], bookmarks: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    if (!userId) return empty;

    const { data } = await supabase
      .from('board_data')
      .select('data')
      .eq('board_id', boardId)
      .single();

    if (data?.data) {
      const d = data.data as Record<string, unknown>;
      return {
        shapes: (d.shapes as Shape[]) || [],
        notes: (d.notes as NoteShape[]) || [],
        checklists: (d.checklists as ChecklistShape[]) || [],
        bookmarks: (d.bookmarks as Bookmark[]) || [],
        viewport: (d.viewport as Viewport) || { x: 0, y: 0, zoom: 1 },
      };
    }

    return empty;
  }, [userId]);

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
    if (!userId) return;

    // Debounced save — 3 seconds
    if (saveBoardDataRef.current) clearTimeout(saveBoardDataRef.current);
    saveBoardDataRef.current = setTimeout(async () => {
      await supabase.from('board_data').upsert({
        board_id: boardId,
        user_id: userId,
        data,
        updated_at: Date.now(),
      });

      setBoards((prev) => prev.map((b) =>
        b.id === boardId ? { ...b, updatedAt: Date.now() } : b
      ));
    }, 3000);
  }, [userId]);

  const getBoardsForProject = useCallback((projectId: string) => {
    return boards.filter((b) => b.projectId === projectId);
  }, [boards]);

  const getBoardById = useCallback((boardId: string) => {
    return boards.find((b) => b.id === boardId) ?? null;
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
  };
}
