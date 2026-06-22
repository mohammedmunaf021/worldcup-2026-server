import fetch from "node-fetch";
import { toCode, isRealTeam } from "./teamCodes.js";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// In-memory cache. This is intentionally simple — refreshed periodically
// rather than sub-second "live", because no trustworthy free real-time
// World Cup 2026 API exists. Source: openfootball/worldcup.json (CC0 public domain).
let cache = {
  matches: [],
  standingsByGroup: {},
  topScorers: [],
  lastUpdated: null,
  source: SOURCE_URL,
  ok: false,
};

export function getCache() {
  return cache;
}

function groupLetter(groupName) {
  // openfootball uses "Group A" — normalize to just "A" to match the frontend.
  const match = /Group\s+([A-Z])/i.exec(groupName || "");
  return match ? match[1].toUpperCase() : null;
}

// Parses openfootball's "13:00 UTC-6" style time string + date into a real
// Date object (in UTC), or null if it can't be parsed.
function parseKickoff(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const match = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d+)$/.exec(timeStr.trim());
  if (!match) return null;
  const [, hh, mm, offset] = match;
  // Build an ISO string with the explicit offset, e.g. "2026-06-11T13:00:00-06:00"
  const sign = offset.startsWith("-") ? "-" : "+";
  const offsetHours = Math.abs(parseInt(offset, 10)).toString().padStart(2, "0");
  const iso = `${dateStr}T${hh.padStart(2, "0")}:${mm}:00${sign}${offsetHours}:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Estimated match duration including stoppage time, half time, etc.
const ESTIMATED_MATCH_MINUTES = 125;

// Derives whether a match is "live right now" — an ESTIMATE, since the
// underlying dataset only updates ~daily and has no true in-play flag.
// A match counts as live if its kickoff has passed, the estimated duration
// window hasn't elapsed yet, AND it's not yet marked played in the dataset
// (once the dataset catches up and marks it played, it stops being "live").
function deriveLiveStatus(match, now) {
  const kickoff = parseKickoff(match.date, match.time);
  if (!kickoff) return { status: match.played ? "finished" : "scheduled", kickoff: null, minute: null };

  if (match.played) {
    return { status: "finished", kickoff: kickoff.toISOString(), minute: null };
  }

  const elapsedMs = now - kickoff;
  const elapsedMin = Math.floor(elapsedMs / 60000);

  if (elapsedMs < 0) {
    return { status: "scheduled", kickoff: kickoff.toISOString(), minute: null };
  }
  if (elapsedMin <= ESTIMATED_MATCH_MINUTES) {
    return { status: "live-estimated", kickoff: kickoff.toISOString(), minute: Math.min(elapsedMin, 90) };
  }
  // Kickoff was a while ago but our data source hasn't confirmed a result yet.
  return { status: "awaiting-result", kickoff: kickoff.toISOString(), minute: null };
}

export async function refreshFixtures() {
  const res = await fetch(SOURCE_URL, { timeout: 15000 });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const raw = await res.json();
  const now = new Date();

  const matches = (raw.matches || []).map((m, i) => {
    const base = {
      id: i,
      round: m.round,
      group: groupLetter(m.group),
      date: m.date,
      time: m.time || null,
      team1: m.team1,
      team1Code: toCode(m.team1),
      team2: m.team2,
      team2Code: toCode(m.team2),
      ground: m.ground || null,
      score: m.score || null, // { ft: [a,b], ht: [a,b] }
      goals1: m.goals1 || [],
      goals2: m.goals2 || [],
      played: Boolean(m.score && m.score.ft),
      isPlaceholder: !isRealTeam(m.team1) || !isRealTeam(m.team2),
    };
    const live = deriveLiveStatus(base, now);
    return { ...base, ...live };
  });

  cache = {
    matches,
    standingsByGroup: computeStandings(matches),
    topScorers: computeTopScorers(matches),
    lastUpdated: new Date().toISOString(),
    source: SOURCE_URL,
    ok: true,
  };

  console.log(`Fixtures refreshed: ${matches.length} matches, ${matches.filter((m) => m.played).length} played`);
  return cache;
}

function computeStandings(matches) {
  const table = {}; // group letter -> code -> stats

  for (const m of matches) {
    if (!m.group || !m.played || m.isPlaceholder) continue;
    const [a, b] = m.score.ft;
    const g = m.group;
    table[g] = table[g] || {};
    table[g][m.team1Code] = table[g][m.team1Code] || blankRow(m.team1Code);
    table[g][m.team2Code] = table[g][m.team2Code] || blankRow(m.team2Code);

    const t1 = table[g][m.team1Code];
    const t2 = table[g][m.team2Code];
    t1.played++;
    t2.played++;
    t1.gf += a;
    t1.ga += b;
    t2.gf += b;
    t2.ga += a;

    if (a > b) {
      t1.won++;
      t2.lost++;
      t1.pts += 3;
    } else if (a < b) {
      t2.won++;
      t1.lost++;
      t2.pts += 3;
    } else {
      t1.drawn++;
      t2.drawn++;
      t1.pts += 1;
      t2.pts += 1;
    }
  }

  const result = {};
  for (const [group, teams] of Object.entries(table)) {
    result[group] = Object.values(teams)
      .map((r) => ({ ...r, gd: r.gf - r.ga }))
      .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
  }
  return result;
}

function blankRow(code) {
  return { code, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
}

function computeTopScorers(matches) {
  const tally = {}; // name -> { name, teamCode, goals }

  for (const m of matches) {
    if (m.isPlaceholder) continue;
    for (const goal of m.goals1 || []) {
      bump(tally, goal.name, m.team1Code);
    }
    for (const goal of m.goals2 || []) {
      bump(tally, goal.name, m.team2Code);
    }
  }

  return Object.values(tally)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 25)
    .map((row, i) => ({ rank: i + 1, ...row }));
}

function bump(tally, name, teamCode) {
  if (!name) return;
  tally[name] = tally[name] || { name, teamCode, goals: 0 };
  tally[name].goals++;
}
