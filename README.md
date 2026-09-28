# Dartify

A darts scoreboard for the phone. Pick a game, add your players and score every dart by tapping the board.



https://github.com/user-attachments/assets/a0808669-7592-4697-b508-24cd1a06fd85



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
