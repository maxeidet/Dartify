import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: any | null; // We can type this later based on schema
  isInitialized: boolean;
  
  initialize: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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
        set({ profile: data });
      }
    };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
}));
