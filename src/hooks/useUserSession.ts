import { useState, useCallback } from 'react';
import type { UserProfile, UserSession } from '../types';
import { generateId } from '../utils';

const SESSION_KEY = 'wb-session';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: UserSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(session: UserSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function useUserSession() {
  const [session, setSession] = useState<UserSession | null>(() => loadSession());

  const login = useCallback((name: string, color: string, avatar: string) => {
    const profile: UserProfile = {
      id: generateId(),
      name,
      color,
      avatar,
    };
    const newSession: UserSession = {
      profile,
      expiresAt: Date.now() + THIRTY_DAYS,
    };
    saveSession(newSession);
    setSession(newSession);
    return newSession;
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated: UserSession = {
        ...prev,
        profile: { ...prev.profile, ...updates },
        expiresAt: Date.now() + THIRTY_DAYS, // extend session
      };
      saveSession(updated);
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  // Extend session on load
  if (session && session.expiresAt - Date.now() < THIRTY_DAYS * 0.5) {
    const extended = { ...session, expiresAt: Date.now() + THIRTY_DAYS };
    saveSession(extended);
  }

  return {
    session,
    profile: session?.profile ?? null,
    isLoggedIn: !!session,
    login,
    updateProfile,
    logout,
  };
}
