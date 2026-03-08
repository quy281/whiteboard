import { useState, useCallback, useEffect } from 'react';
import type { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';

export function useUserSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile({
        id: data.id,
        name: data.name,
        color: data.color,
        avatar: data.avatar,
      });
    }
    setIsLoading(false);
  };

  const signup = useCallback(async (email: string, password: string, name: string, color: string, avatar: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, color, avatar },
      },
    });
    if (error) throw error;
    if (data.user) {
      setProfile({ id: data.user.id, name, color, avatar });
    }
    return data;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<UserProfile, 'name' | 'color' | 'avatar'>>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
    }
  }, [user]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return {
    user,
    profile,
    isLoggedIn: !!user,
    isLoading,
    signup,
    login,
    updateProfile,
    logout,
  };
}
