import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { db, initDb } from "./db.js";
import { refreshFixtures, getCache } from "./fixtures.js";
import predictionsRouter from "./predictions.js";
import leaderboardRouter from "./leaderboard.js";
import shootoutRouter from "./shootout.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

initDb();

// --- Fixture / standings / scorers data, refreshed periodically from openfootball ---
app.get("/api/fixtures", (req, res) => {
  res.json(getCache());
});

// Subset for the Live Match Center — matches that are estimated live right
// now, plus ones that finished in the last few hours, so the page has
// something to show even between live windows.
app.get("/api/live", (req, res) => {
  const { matches, lastUpdated } = getCache();
  const live = matches.filter((m) => m.status === "live-estimated" || m.status === "awaiting-result");
  const recentlyFinished = matches
    .filter((m) => m.status === "finished")
    .slice(-6);
  res.json({ live, recentlyFinished, lastUpdated });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/predictions", predictionsRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/shootout", shootoutRouter);

// Refresh fixture data on boot, then every 10 minutes.
// This is NOT sub-second live — it's a real public dataset polled periodically.
// See README for why: no trustworthy free real-time WC2026 API exists yet.
refreshFixtures().catch((e) => console.error("Initial fixture fetch failed:", e.message));
cron.schedule("*/10 * * * *", () => {
  refreshFixtures().catch((e) => console.error("Scheduled fixture fetch failed:", e.message));
});

app.listen(PORT, () => {
  console.log(`World Cup 2026 API listening on port ${PORT}`);
});
