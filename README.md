# Dartify

A darts scoreboard for the phone. Pick a game, add your players and score every dart by tapping the board.

<!-- Drop bdc-ad.mp4 here in the GitHub editor; it becomes a user-attachments link. -->
VIDEO_URL_HERE

## Features

- **X01** (301 / 501 / 701) with double in and double out
- **Around the Clock** and **Round the World** practice modes
- Score on a real dartboard with a magnifier, or with a quick-tap grid
- Round history, averages and per-player stats
- Local players plus accounts synced with Supabase

## Getting started

```bash
npm install
npm run dev
```

Create a `.env` file with your Supabase project:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The database schema is in [`supabase/schema.sql`](supabase/schema.sql).

## Built with

React, TypeScript, Vite, Tailwind CSS, Zustand and Supabase.
