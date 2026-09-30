// ============================================================
// Zustand Lobby Store
// Create/join lobbies, invite friends, leader-controlled game mode,
// and kicking off a live-synced online match.
// ============================================================

import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isOnlineModeAvailable } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { useGameStore } from './gameStore';
import { getEngine } from '../core/gameModeRegistry';
import { createX01Game } from '../core/x01Engine';
import { createAroundTheClockGame } from '../core/aroundTheClockEngine';
import { createRoundTheWorldGame } from '../core/roundTheWorldEngine';
import type {
  GameConfig,
  GameState,
  LobbyParticipantStatus,
  LobbyStatus,
  Participant,
  X01Config,
  AroundTheClockConfig,
  RoundTheWorldConfig,
} from '../core/types';

// ─────────────────────────────────────────────
// DB row shapes
// ─────────────────────────────────────────────

export interface LobbyRecord {
  id: string;
  host_id: string;
  name: string | null;
  status: LobbyStatus;
  game_mode: string;
  game_config: GameConfig;
  active_match_id: string | null;
  created_at: string;
}

export interface LobbyParticipantRecord {
  id: string;
  lobby_id: string;
  profile_id: string | null;
  local_player_id: string | null;
  status: LobbyParticipantStatus;
  display_order: number;
  created_at: string;
  displayName: string;
}

export interface LobbyInvite {
  participantId: string;
  lobbyId: string;
  lobbyName: string;
  hostName: string;
}

const DEFAULT_X01_CONFIG: X01Config = {
  mode: 'x01',
  startingScore: 501,
  doubleOut: true,
  doubleIn: false,
  legs: 1,
};

function buildGameState(matchId: string, participants: Participant[], config: GameConfig): GameState {
  if (config.mode === 'x01') return createX01Game(matchId, participants, config as X01Config);
  if (config.mode === 'around_the_clock') return createAroundTheClockGame(matchId, participants, config as AroundTheClockConfig);
  return createRoundTheWorldGame(matchId, participants, config as RoundTheWorldConfig);
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

interface LobbyStore {
  lobby: LobbyRecord | null;
  participants: LobbyParticipantRecord[];
  loading: boolean;
  error: string | null;

  myInvites: LobbyInvite[];

  createLobby: () => Promise<string | null>;
  loadLobby: (lobbyId: string) => Promise<void>;
  subscribe: (lobbyId: string) => void;
  unsubscribe: () => void;
  reset: () => void;

  inviteFriend: (profileId: string) => Promise<void>;
  addLocalPlayer: (localPlayerId: string) => Promise<void>;
  respondToInvite: (participantId: string, accept: boolean) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
  leaveLobby: () => Promise<void>;

  updateGameMode: (config: GameConfig) => Promise<void>;
  startMatch: () => Promise<void>;

  fetchMyInvites: () => Promise<void>;
  subscribeToMyInvites: () => void;
  unsubscribeFromMyInvites: () => void;
}

let lobbyChannel: RealtimeChannel | null = null;
let invitesChannel: RealtimeChannel | null = null;

async function hydrateParticipants(rows: {
  id: string; lobby_id: string; profile_id: string | null; local_player_id: string | null;
  status: LobbyParticipantStatus; display_order: number; created_at: string;
}[]): Promise<LobbyParticipantRecord[]> {
  const profileIds = rows.map(r => r.profile_id).filter((v): v is string => !!v);
  const localIds = rows.map(r => r.local_player_id).filter((v): v is string => !!v);

  const [{ data: profiles }, { data: locals }] = await Promise.all([
    profileIds.length ? supabase.from('profiles').select('id, username').in('id', profileIds) : Promise.resolve({ data: [] as { id: string; username: string }[] }),
    localIds.length ? supabase.from('local_players').select('id, name').in('id', localIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.username]));
  const localMap = new Map((locals ?? []).map(p => [p.id, p.name]));

  return rows
    .map(r => ({
      ...r,
      displayName: r.profile_id
        ? profileMap.get(r.profile_id) ?? 'Unknown'
        : localMap.get(r.local_player_id ?? '') ?? 'Local player',
    }))
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at));
}

export const useLobbyStore = create<LobbyStore>((set, get) => ({
  lobby: null,
  participants: [],
  loading: false,
  error: null,
  myInvites: [],

  createLobby: async () => {
    const user = useAuthStore.getState().user;
    const profile = useAuthStore.getState().profile;
    if (!user || !isOnlineModeAvailable) return null;

    // Generate the id client-side so we never need to read the row straight back
    // in the same round-trip (chaining .select() on the insert hit an RLS/snapshot
    // edge case where the read-back of a row this same statement just wrote could
    // get rejected even though the insert itself had already committed).
    const lobbyId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

    const { error } = await supabase
      .from('lobbies')
      .insert({ id: lobbyId, host_id: user.id, name: `${profile?.username ?? 'Player'}'s lobby` });

    if (error) {
      set({ error: error.message });
      return null;
    }

    await supabase.from('lobby_participants').insert({
      lobby_id: lobbyId,
      profile_id: user.id,
      status: 'joined',
      display_order: 0,
    });

    return lobbyId;
  },

  loadLobby: async (lobbyId: string) => {
    set({ loading: true, error: null });

    const [{ data: lobby, error: lobbyErr }, { data: participantRows, error: partErr }] = await Promise.all([
      supabase.from('lobbies').select('*').eq('id', lobbyId).single(),
      supabase.from('lobby_participants').select('*').eq('lobby_id', lobbyId),
    ]);

    if (lobbyErr || !lobby) {
      set({ loading: false, error: lobbyErr?.message ?? 'Lobby not found' });
      return;
    }

    const participants = await hydrateParticipants(partErr || !participantRows ? [] : participantRows);
    set({ lobby: lobby as LobbyRecord, participants, loading: false });
  },

  subscribe: (lobbyId: string) => {
    if (!isOnlineModeAvailable) return;
    get().unsubscribe();

    lobbyChannel = supabase
      .channel(`lobby-${lobbyId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` }, (payload) => {
        set({ lobby: payload.new as LobbyRecord });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_participants', filter: `lobby_id=eq.${lobbyId}` }, async () => {
        const { data } = await supabase.from('lobby_participants').select('*').eq('lobby_id', lobbyId);
        const participants = await hydrateParticipants(data ?? []);
        set({ participants });
      })
      .subscribe();
  },

  unsubscribe: () => {
    if (lobbyChannel) {
      supabase.removeChannel(lobbyChannel);
      lobbyChannel = null;
    }
  },

  reset: () => {
    get().unsubscribe();
    set({ lobby: null, participants: [], loading: false, error: null });
  },

  inviteFriend: async (profileId) => {
    const { lobby, participants } = get();
    if (!lobby) return;
    if (participants.some(p => p.profile_id === profileId)) return;

    await supabase.from('lobby_participants').insert({
      lobby_id: lobby.id,
      profile_id: profileId,
      status: 'invited',
      display_order: participants.length,
    });
  },

  addLocalPlayer: async (localPlayerId) => {
    const { lobby, participants } = get();
    if (!lobby) return;
    if (participants.some(p => p.local_player_id === localPlayerId)) return;

    await supabase.from('lobby_participants').insert({
      lobby_id: lobby.id,
      local_player_id: localPlayerId,
      status: 'joined',
      display_order: participants.length,
    });
  },

  respondToInvite: async (participantId, accept) => {
    await supabase
      .from('lobby_participants')
      .update({ status: accept ? 'joined' : 'declined' })
      .eq('id', participantId);
    await get().fetchMyInvites();
  },

  removeParticipant: async (participantId) => {
    await supabase.from('lobby_participants').delete().eq('id', participantId);
  },

  leaveLobby: async () => {
    const { lobby, participants } = get();
    const user = useAuthStore.getState().user;
    if (!lobby || !user) return;

    if (lobby.host_id === user.id) {
      await supabase.from('lobbies').delete().eq('id', lobby.id);
    } else {
      const mine = participants.find(p => p.profile_id === user.id);
      if (mine) await supabase.from('lobby_participants').delete().eq('id', mine.id);
    }
    get().reset();
  },

  updateGameMode: async (config) => {
    const { lobby } = get();
    const user = useAuthStore.getState().user;
    if (!lobby || !user || lobby.host_id !== user.id) return;

    await supabase
      .from('lobbies')
      .update({ game_mode: config.mode, game_config: config })
      .eq('id', lobby.id);
  },

  startMatch: async () => {
    const { lobby, participants } = get();
    const user = useAuthStore.getState().user;
    if (!lobby || !user || lobby.host_id !== user.id) return;

    const joined = participants.filter(p => p.status === 'joined');
    if (joined.length === 0) return;

    const matchParticipants: Participant[] = joined.map((p, i) => ({
      id: p.id,
      type: p.profile_id ? 'online' : 'local',
      displayName: p.displayName,
      displayOrder: i,
    }));

    const config = (lobby.game_config as GameConfig) ?? DEFAULT_X01_CONFIG;
    const matchId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

    const gameState = buildGameState(matchId, matchParticipants, config);
    // Touch the engine so the mode is guaranteed to be registered before anyone relies on it.
    getEngine(gameState.gameMode);

    const insert: Record<string, unknown> = {
      id: matchId,
      lobby_id: lobby.id,
      game_mode: config.mode,
      game_config: config,
      status: 'ongoing',
      state: gameState,
    };
    if (config.mode === 'x01') {
      insert.double_out = config.doubleOut;
      insert.double_in = config.doubleIn;
    }

    const { error } = await supabase.from('matches').insert(insert);
    if (error) {
      set({ error: error.message });
      return;
    }

    await supabase
      .from('lobbies')
      .update({ status: 'in_progress', active_match_id: matchId })
      .eq('id', lobby.id);

    const myControlledIds = joined
      .filter(p => p.profile_id === user.id || (p.local_player_id && lobby.host_id === user.id))
      .map(p => p.id);

    useGameStore.getState().startOnlineGame(matchId, lobby.id, myControlledIds, gameState);
  },

  fetchMyInvites: async () => {
    const user = useAuthStore.getState().user;
    if (!user || !isOnlineModeAvailable) return;

    const { data: invites } = await supabase
      .from('lobby_participants')
      .select('id, lobby_id')
      .eq('profile_id', user.id)
      .eq('status', 'invited');

    if (!invites || invites.length === 0) {
      set({ myInvites: [] });
      return;
    }

    const lobbyIds = [...new Set(invites.map(i => i.lobby_id))];
    const { data: lobbies } = await supabase.from('lobbies').select('id, name, host_id').in('id', lobbyIds);
    const hostIds = [...new Set((lobbies ?? []).map(l => l.host_id))];
    const { data: hosts } = hostIds.length
      ? await supabase.from('profiles').select('id, username').in('id', hostIds)
      : { data: [] as { id: string; username: string }[] };

    const lobbyMap = new Map((lobbies ?? []).map(l => [l.id, l]));
    const hostMap = new Map((hosts ?? []).map(h => [h.id, h.username]));

    const myInvites: LobbyInvite[] = invites.map(i => {
      const l = lobbyMap.get(i.lobby_id);
      return {
        participantId: i.id,
        lobbyId: i.lobby_id,
        lobbyName: l?.name ?? 'Lobby',
        hostName: (l ? hostMap.get(l.host_id) : undefined) ?? 'Someone',
      };
    });

    set({ myInvites });
  },

  subscribeToMyInvites: () => {
    const user = useAuthStore.getState().user;
    if (!user || !isOnlineModeAvailable) return;
    get().unsubscribeFromMyInvites();

    invitesChannel = supabase
      .channel(`invites-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_participants', filter: `profile_id=eq.${user.id}` }, () => {
        get().fetchMyInvites();
      })
      .subscribe();
  },

  unsubscribeFromMyInvites: () => {
    if (invitesChannel) {
      supabase.removeChannel(invitesChannel);
      invitesChannel = null;
    }
  },
}));
