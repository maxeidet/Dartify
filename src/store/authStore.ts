import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string | null;
  [key: string]: unknown;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isInitialized: boolean;

  initialize: () => void;
  signOut: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isInitialized: false,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isInitialized: true
      });
      if (session?.user) fetchProfile(session.user.id);
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isInitialized: true
      });

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        set({ profile: null });
      }
    });

    // Helper to fetch custom profile data
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        set({ profile: data as Profile });
      }
    };
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error && data) set({ profile: data as Profile });
  },

  updateUsername: async (username: string) => {
    const { user } = get();
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);
    if (!error) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, username } : null,
      }));
    } else {
      throw new Error(error.message);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
}));

