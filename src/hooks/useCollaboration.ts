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
}

export function useCollaboration(
  onShapesChange: (shapes: Shape[]) => void
): CollaborationReturn {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const shapesArrayRef = useRef<Y.Array<Shape> | null>(null);
  const cursorsRef = useRef<UserCursor[]>([]);
  const usersRef = useRef<UserInfo[]>([]);
  const connectedRef = useRef(false);
  const localUserRef = useRef<UserInfo>({
    id: Math.random().toString(36).slice(2),
    name: randomName(),
    color: randomColor(),
  });
  const roomIdRef = useRef(getRoomId());
  const forceUpdateRef = useRef(0);

  // Force re-render helper
  const setForceUpdate = useCallback(() => {
    forceUpdateRef.current++;
  }, []);

  useEffect(() => {
    const doc = new Y.Doc();
    const roomId = roomIdRef.current;

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

    // Listen for shapes changes
    shapesArray.observe(() => {
      const shapes = shapesArray.toArray();
      onShapesChange(shapes);
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
  }, [onShapesChange, setForceUpdate]);

  return {
    shapesArray: shapesArrayRef.current,
    awareness: providerRef.current?.awareness ?? null,
    cursors: cursorsRef.current,
    users: [...usersRef.current, localUserRef.current],
    localUser: localUserRef.current,
    roomId: roomIdRef.current,
    isConnected: connectedRef.current,
  };
}
