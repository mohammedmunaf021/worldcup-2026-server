import { Router } from "express";
import crypto from "crypto";
import { db } from "../db.js";

const router = Router();

const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function validatePicks(picks) {
  if (typeof picks !== "object" || picks === null) return false;
  for (const key of Object.keys(picks)) {
    if (!GROUP_LETTERS.includes(key)) return false;
    if (typeof picks[key] !== "string" || picks[key].length > 10) return false;
  }
  return true;
}

// GET /api/predictions/:deviceId — fetch this device's saved predictions
router.get("/:deviceId", (req, res) => {
  const { deviceId } = req.params;
  const entry = db.get("predictions").find({ deviceId }).value();
  if (!entry) return res.json(null);
  res.json(entry);
});

// POST /api/predictions — create or update predictions for a device
// body: { deviceId, name, picks }
router.post("/", (req, res) => {
  const { deviceId, name, picks } = req.body || {};

  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "deviceId is required" });
  }
  if (!validatePicks(picks || {})) {
    return res.status(400).json({ error: "Invalid picks format" });
  }
  const safeName = (name || "").toString().trim().slice(0, 40) || "Anonymous";

  const existing = db.get("predictions").find({ deviceId }).value();
  const now = new Date().toISOString();

  if (existing) {
    db.get("predictions")
      .find({ deviceId })
      .assign({ name: safeName, picks, updatedAt: now })
      .write();
  } else {
    db.get("predictions")
      .push({
        id: crypto.randomUUID(),
        deviceId,
        name: safeName,
        picks,
        createdAt: now,
        updatedAt: now,
        score: 0, // computed once group stage results are final
      })
      .write();
  }

  const saved = db.get("predictions").find({ deviceId }).value();
  res.json(saved);
});

export default router;
