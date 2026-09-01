-- ============================================================
-- Dart Scoreboard PWA — Supabase Schema
-- Run this entire file in the Supabase SQL editor
-- ============================================================

-- Enable UUID extension (already enabled on new Supabase projects)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. PROFILES (1:1 with auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- 2. LOCAL PLAYERS (offline friends, owned by a profile)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS local_players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE local_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "local_players: owner all"
  ON local_players FOR ALL USING (auth.uid() = owner_id);

-- ─────────────────────────────────────────────
-- 3. LOBBIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lobbies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id     UUID NOT NULL REFERENCES profiles(id),
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lobbies: authenticated read"
  ON lobbies FOR SELECT TO authenticated USING (true);

CREATE POLICY "lobbies: host insert"
  ON lobbies FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "lobbies: host update"
  ON lobbies FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "lobbies: host delete"
  ON lobbies FOR DELETE USING (auth.uid() = host_id);

-- ─────────────────────────────────────────────
-- 4. LOBBY PARTICIPANTS (online users OR local_players, never both)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lobby_participants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id         UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  profile_id       UUID REFERENCES profiles(id),
  local_player_id  UUID REFERENCES local_players(id),
  display_order    INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_player_type CHECK (
    (profile_id IS NOT NULL)::int + (local_player_id IS NOT NULL)::int = 1
  )
);

ALTER TABLE lobby_participants ENABLE ROW LEVEL SECURITY;

-- Lobby members can read participants
CREATE POLICY "lobby_participants: lobby member read"
  ON lobby_participants FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM lobbies l
      WHERE l.id = lobby_id
    )
  );

-- Host manages participants
CREATE POLICY "lobby_participants: host write"
  ON lobby_participants FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lobbies l
      WHERE l.id = lobby_id AND l.host_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 5. MATCHES (created inside a lobby)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id        UUID NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  -- Game configuration
  game_mode       TEXT NOT NULL DEFAULT '501',        -- '301','501','701','around_the_clock','cricket','etc'
  game_config     JSONB NOT NULL DEFAULT '{}',        -- Flexible config for any game mode
  -- X01 specific convenience columns (NULL for non-X01 modes)
  double_out      BOOLEAN,
  double_in       BOOLEAN,
  -- Status
  status          TEXT NOT NULL DEFAULT 'ongoing'
                  CHECK (status IN ('ongoing', 'finished')),
  winner_id       UUID REFERENCES lobby_participants(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches: lobby member read"
  ON matches FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM lobbies l WHERE l.id = lobby_id)
  );

CREATE POLICY "matches: host write"
  ON matches FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lobbies l
      WHERE l.id = lobby_id AND l.host_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 6. THROWS (individual darts)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS throws (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  participant_id   UUID NOT NULL REFERENCES lobby_participants(id),
  round_number     INT NOT NULL,
  dart_number      INT NOT NULL CHECK (dart_number BETWEEN 1 AND 3),
  -- Throw data (generic enough for any game mode)
  segment          INT NOT NULL CHECK (segment BETWEEN 0 AND 25),  -- 0=miss, 25=bull, 1-20=number
  multiplier       INT NOT NULL CHECK (multiplier BETWEEN 1 AND 3), -- 1=S, 2=D, 3=T
  score_value      INT NOT NULL,   -- computed value (segment × multiplier, with bull special cases)
  is_bust          BOOLEAN NOT NULL DEFAULT false,
  -- Metadata stored as JSONB for game-mode-specific data (e.g. ATC target hit)
  throw_meta       JSONB NOT NULL DEFAULT '{}',
  thrown_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE throws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "throws: lobby member read"
  ON throws FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN lobbies l ON l.id = m.lobby_id
      WHERE m.id = match_id
    )
  );

CREATE POLICY "throws: participant write"
  ON throws FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lobby_participants lp
      WHERE lp.id = participant_id AND lp.profile_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 7. INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_local_players_owner ON local_players(owner_id);
CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby ON lobby_participants(lobby_id);
CREATE INDEX IF NOT EXISTS idx_matches_lobby ON matches(lobby_id);
CREATE INDEX IF NOT EXISTS idx_throws_match ON throws(match_id);
CREATE INDEX IF NOT EXISTS idx_throws_participant ON throws(participant_id);
CREATE INDEX IF NOT EXISTS idx_throws_round ON throws(match_id, round_number);

-- ─────────────────────────────────────────────
-- 8. REALTIME (enable for online multiplayer)
-- ─────────────────────────────────────────────
-- Run these in Supabase Dashboard → Database → Replication
-- or via the API:
-- ALTER PUBLICATION supabase_realtime ADD TABLE throws;
-- ALTER PUBLICATION supabase_realtime ADD TABLE matches;
