import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

export interface LocalPlayer {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface PlayerState {
  players: LocalPlayer[];
  loading: boolean;
  
  fetchPlayers: () => Promise<void>;
  addPlayer: (name: string) => Promise<LocalPlayer | null>;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  players: [],
  loading: false,

  fetchPlayers: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true });
    
    // We only fetch local players owned by the current user
    const { data, error } = await supabase
      .from('local_players')
      .select('id, name, avatar_url')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      set({ players: data, loading: false });
    } else {
      set({ loading: false });
    }
  },

  addPlayer: async (name: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('local_players')
      .insert({
        owner_id: user.id,
        name: name.trim()
      })
      .select('id, name, avatar_url')
      .single();

    if (!error && data) {
      set((state) => ({ players: [...state.players, data] }));
      return data;
    }
    
    console.error('Error adding player:', error);
    return null;
  }
}));
