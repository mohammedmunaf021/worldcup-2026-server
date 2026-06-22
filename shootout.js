import { Router } from "express";
import crypto from "crypto";
import { db } from "./db.js";

const router = Router();

// GET /api/shootout/:deviceId — this device's personal best only.
// (No public leaderboard — just your own high score, per the site's design.)
router.get("/:deviceId", (req, res) => {
  const { deviceId } = req.params;
  const entry = db.get("shootoutScores").find({ deviceId }).value();
  res.json(entry || null);
});

// POST /api/shootout — submit/update a device's best streak
// body: { deviceId, name, score }
router.post("/", (req, res) => {
  const { deviceId, name, score } = req.body || {};

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "deviceId is required" });
  }
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100000) {
    return res.status(400).json({ error: "Invalid score" });
  }
  const safeName = (name || "").toString().trim().slice(0, 40) || "Anonymous";
  const now = new Date().toISOString();

  const existing = db.get("shootoutScores").find({ deviceId }).value();

  if (existing) {
    if (numericScore > existing.best) {
      db.get("shootoutScores")
        .find({ deviceId })
        .assign({ best: numericScore, name: safeName, updatedAt: now })
        .write();
    }
  } else {
    db.get("shootoutScores")
      .push({
        id: crypto.randomUUID(),
        deviceId,
        name: safeName,
        best: numericScore,
        createdAt: now,
        updatedAt: now,
      })
      .write();
  }

  const saved = db.get("shootoutScores").find({ deviceId }).value();
  res.json(saved);
});

export default router;
