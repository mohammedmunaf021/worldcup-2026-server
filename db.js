import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

import fs from "fs";
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const adapter = new FileSync(path.join(dataDir, "db.json"));
export const db = low(adapter);

export function initDb() {
  db.defaults({
    predictions: [], // { id, name, deviceId, picks: {A: 'MEX', ...}, createdAt, updatedAt }
    shootoutScores: [], // { id, name, deviceId, best, createdAt, updatedAt }
  }).write();
}
