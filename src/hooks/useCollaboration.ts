import { useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
// @ts-ignore - y-webrtc has no types
import { WebrtcProvider } from 'y-webrtc';
import type { Shape, UserCursor, UserInfo } from '../types';
import { getRoomId, randomColor, randomName } from '../utils';

interface CollaborationReturn {
  shapesArray: Y.Array<Shape> | null;
  awareness: WebrtcProvider['awareness'] | null;
  cursors: UserCursor[];
  users: UserInfo[];
  localUser: UserInfo;
  roomId: string;
  isConnected: boolean;
  isSelfChangeRef: React.MutableRefObject<boolean>;
}

export function useCollaboration(
  onShapesChange: (shapes: Shape[]) => void,
  userProfile?: { id: string; name: string; color: string } | null,
  roomIdOverride?: string,
): CollaborationReturn {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const shapesArrayRef = useRef<Y.Array<Shape> | null>(null);
  const cursorsRef = useRef<UserCursor[]>([]);
  const usersRef = useRef<UserInfo[]>([]);
  const connectedRef = useRef(false);
  const localUserRef = useRef<UserInfo>({
    id: userProfile?.id ?? Math.random().toString(36).slice(2),
    name: userProfile?.name ?? randomName(),
    color: userProfile?.color ?? randomColor(),
  });
  const forceUpdateRef = useRef(0);
  // Flag to skip observer when we initiated the change ourselves
  const isSelfChangeRef = useRef(false);

  // Derive room id — recalculated when roomIdOverride changes
  const roomId = roomIdOverride ?? getRoomId();

  // Force re-render helper
  const setForceUpdate = useCallback(() => {
    forceUpdateRef.current++;
  }, []);

  useEffect(() => {
    const doc = new Y.Doc();

    const provider = new WebrtcProvider(roomId, doc, {
      signaling: ['wss://signaling.yjs.dev'],
    });

    const shapesArray = doc.getArray<Shape>('shapes');

    docRef.current = doc;
    providerRef.current = provider;
    shapesArrayRef.current = shapesArray;

    // Set local awareness
    provider.awareness.setLocalStateField('user', localUserRef.current);
    provider.awareness.setLocalStateField('cursor', null);

    // Listen for shapes changes — only propagate REMOTE changes
    shapesArray.observe(() => {
      // Skip if we triggered this change ourselves
      if (isSelfChangeRef.current) return;
      const shapes = shapesArray.toArray();
      // Only update if remote peer sent real data
      if (shapes.length > 0) {
        onShapesChange(shapes);
      }
    });

    // Listen for awareness changes
    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates();
      const newCursors: UserCursor[] = [];
      const newUsers: UserInfo[] = [];

      states.forEach((state: Record<string, unknown>, clientId: number) => {
        if (clientId === provider.awareness.clientID) return;
        const user = state.user as UserInfo | undefined;
        const cursor = state.cursor as { x: number; y: number } | undefined;
        if (user) {
          newUsers.push(user);
          if (cursor) {
            newCursors.push({
              id: user.id,
              name: user.name,
              color: user.color,
              x: cursor.x,
              y: cursor.y,
            });
          }
        }
      });

      cursorsRef.current = newCursors;
      usersRef.current = newUsers;
      setForceUpdate();
    });

    // Connection status
    provider.on('synced', () => {
      connectedRef.current = true;
      setForceUpdate();
    });

    connectedRef.current = true;

    return () => {
      provider.disconnect();
      provider.destroy();
      doc.destroy();
    };
  }, [roomId, onShapesChange, setForceUpdate]);

  return {
    shapesArray: shapesArrayRef.current,
    awareness: providerRef.current?.awareness ?? null,
    cursors: cursorsRef.current,
    users: [...usersRef.current, localUserRef.current],
    localUser: localUserRef.current,
    roomId,
    isConnected: connectedRef.current,
    isSelfChangeRef,
  };
}
