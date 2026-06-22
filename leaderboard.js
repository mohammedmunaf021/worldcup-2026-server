import { Router } from "express";
import { db } from "../db.js";
import { getCache } from "../fixtures.js";

const router = Router();

// A group is "decided" once all 6 matches in it have been played.
// standingsByGroup is already keyed by single letter ("A", "B", ...)
// and rows use `code` (3-letter team code) — see fixtures.js.
function decidedGroupWinners(standingsByGroup) {
  const winners = {};
  for (const [group, table] of Object.entries(standingsByGroup)) {
    const totalPlayed = table.reduce((sum, t) => sum + t.played, 0);
    if (totalPlayed >= 6 && table.length > 0) {
      winners[group] = table[0].code;
    }
  }
  return winners;
}

// GET /api/leaderboard — top predictions ranked by correct group-winner picks
router.get("/", (req, res) => {
  const { standingsByGroup, lastUpdated } = getCache();
  const winners = decidedGroupWinners(standingsByGroup || {});
  const decidedGroups = Object.keys(winners);

  const all = db.get("predictions").value() || [];

  const scored = all.map((entry) => {
    let correct = 0;
    for (const group of decidedGroups) {
      if (entry.picks?.[group] && entry.picks[group] === winners[group]) {
        correct++;
      }
    }
    return {
      name: entry.name,
      correct,
      totalDecided: decidedGroups.length,
      updatedAt: entry.updatedAt,
    };
  });

  scored.sort((a, b) => b.correct - a.correct || new Date(a.updatedAt) - new Date(b.updatedAt));

  res.json({
    leaderboard: scored.slice(0, 100),
    decidedGroups,
    lastUpdated,
  });
});

export default router;
