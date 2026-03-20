-- Letters Dual: Supabase Schema
-- Run this in the Supabase SQL Editor to set up the multiplayer tables

-- Rooms table: each game session
CREATE TABLE IF NOT EXISTS rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  admin_id    text NOT NULL,
  game_state  jsonb NOT NULL DEFAULT '{}',
  phase       text NOT NULL DEFAULT 'lobby',
  created_at  timestamptz DEFAULT now()
);

-- Players table: one row per player per room
CREATE TABLE IF NOT EXISTS players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  team        text NOT NULL DEFAULT 'none',
  client_id   text NOT NULL,
  joined_at   timestamptz DEFAULT now()
);

-- Enable Row Level Security (but allow all for now with anon key)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon role (uses your existing anon key)
CREATE POLICY "Allow all rooms" ON rooms FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all players" ON players FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable Realtime on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Optional: auto-cleanup old rooms (older than 24 hours)
-- You can run this manually or set up a pg_cron job
-- DELETE FROM rooms WHERE created_at < now() - interval '24 hours';
