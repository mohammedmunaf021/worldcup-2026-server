# World Cup 2026 Hub — Backend

A small Node/Express API that powers three things the static frontend can't do
on its own:

1. **Fixture/standings/scorer data** — fetched periodically from a real public
   dataset and cached in memory.
2. **Predictions** — saved per-device, scored against real group results.
3. **Leaderboards** — for predictions accuracy and penalty-shootout high scores.

## Why this isn't "sub-second live"

There is no trustworthy **free** real-time World Cup 2026 API. Several sites
that show up in search results for this look like SEO bait (brand-new
domains, suspiciously perfect feature lists) and weren't used here.

Instead, this backend polls **[openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)**
— a long-running, public-domain (CC0), hand-maintained dataset with real
scores, scorers, and minutes — every 10 minutes, and recomputes standings and
the Golden Boot table from scratch each time. It's genuinely real data, just
not instant. The frontend always shows a "last updated" timestamp so this is
never misrepresented as faster than it is.

If you later get access to a paid real-time provider, swap the fetch logic in
`src/fixtures.js` — everything downstream (standings math, scorer tally,
predictions scoring) stays the same since it all works off the same
normalized `matches` array.

## Local development

```bash
npm install
npm run dev      # auto-restarts on file changes
```

Server runs on `http://localhost:4000` by default. The frontend's `.env`
should point `VITE_API_URL` at this.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/fixtures` | All matches, standings by group, top scorers |
| GET | `/api/live` | Matches estimated live right now + recent results |
| GET | `/api/predictions/:deviceId` | This device's saved picks |
| POST | `/api/predictions` | Save/update picks `{ deviceId, name, picks }` |
| GET | `/api/leaderboard` | Prediction accuracy leaderboard |
| GET | `/api/shootout/:deviceId` | This device's personal best shootout streak |
| POST | `/api/shootout` | Submit a shootout score `{ deviceId, name, score }` |

### About `/api/live`

The underlying dataset has no true "in-play" flag — it's updated roughly
once a day with final results. `/api/live` derives an **estimated** live
status by comparing each match's scheduled kickoff time (parsed from the
dataset's `"13:00 UTC-6"` style time strings) against the current time:

- `scheduled` — kickoff hasn't happened yet
- `live-estimated` — kickoff has passed and we're within an estimated
  125-minute match window, with no result yet
- `awaiting-result` — kickoff was a while ago but the dataset hasn't caught
  up with a final score
- `finished` — result confirmed

This is clearly an estimate, not a guarantee — there's no way to know from
this data source whether a match got delayed, went to penalties, etc. The
frontend's Live Match Center page says as much.

### Note on the shootout endpoint

There's intentionally no public leaderboard endpoint for the shootout game —
by design, the frontend only shows each player their own personal best.
`/api/shootout/:deviceId` only returns that one device's data.

## Data storage

Uses `lowdb` (a tiny JSON-file database) — no native compilation, no separate
database server to manage. Data lives in `data/db.json`, created
automatically on first run. Fine for this project's scale; if it ever needs
to survive a host's filesystem being wiped on redeploy (e.g. some free tiers
reset disk on each deploy), swap in a hosted database later — the route
files are the only place that would need to change.

## Deploying (Render, free tier)

1. Push this folder to a GitHub repo (or a subfolder of one).
2. Go to [render.com](https://render.com), sign up free, click **New +** → **Web Service**.
3. Connect your repo, set:
   - **Root directory**: wherever this `worldcup-2026-server` folder lives
   - **Build command**: `npm install`
   - **Start command**: `npm start`
4. Deploy. Render gives you a URL like `https://your-service.onrender.com`.
5. In the frontend project, set `VITE_API_URL=https://your-service.onrender.com`
   and rebuild (`npm run build`) before redeploying to Netlify.

Note: Render's free tier spins the service down after inactivity and takes
~30-60 seconds to wake up on the next request — the first load after a quiet
period may feel slow. This is a free-tier tradeoff, not a bug.
