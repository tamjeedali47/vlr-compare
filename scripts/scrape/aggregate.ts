// Turns cached match data into per-player match lists and stat windows.
// Pure functions, no I/O.

import type {
  AgentWindowStats,
  AggregateStats,
  MatchRecord,
  PlayerMapResult,
  PlayerMatch,
  WindowKey,
  WindowStats,
} from "../../src/lib/types";
import type { HistoryMatch } from "./parse";

export const SEASON_START = "2026-01-01";

/** Joins a player's history rows with the cached match pages. */
export function buildPlayerMatch(
  playerId: number,
  history: HistoryMatch,
  match: MatchRecord | undefined,
): PlayerMatch {
  const maps: PlayerMapResult[] = history.games.map((game) => {
    const map = match?.maps.find((m) => m.gameId === game.gameId);
    const line = map?.players.find((p) => p.playerId === playerId);
    return {
      gameId: game.gameId,
      map: game.map || map?.map || "",
      score: game.score,
      result: game.result,
      rounds: map?.rounds ?? (game.score ? game.score[0] + game.score[1] : null),
      agent: line?.agent ?? game.agent,
      rating: line?.rating ?? null,
      acs: line?.acs ?? null,
      kills: line?.kills ?? null,
      deaths: line?.deaths ?? null,
      assists: line?.assists ?? null,
      kast: line?.kast ?? null,
      adr: line?.adr ?? null,
      hsPct: line?.hsPct ?? null,
      fk: line?.fk ?? null,
      fd: line?.fd ?? null,
    };
  });

  return {
    matchId: history.matchId,
    date: match?.date ?? `${history.date}T00:00:00Z`,
    event: match?.event ?? history.event,
    series: match?.series ?? null,
    team: history.team,
    opponent: history.opponent,
    result: history.result,
    score: history.score,
    maps,
  };
}

/** Maps that have per-player stats (at least a rating or kills) and a round count. */
function statMaps(maps: PlayerMapResult[]): (PlayerMapResult & { rounds: number })[] {
  return maps.filter(
    (m): m is PlayerMapResult & { rounds: number } =>
      m.rounds !== null && m.rounds > 0 && (m.rating !== null || m.kills !== null),
  );
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

export function aggregate(maps: PlayerMapResult[]): AggregateStats | null {
  const played = statMaps(maps);
  if (played.length === 0) return null;

  // Round-weighted average over the maps where the stat exists (blanks skipped).
  const weighted = (key: "rating" | "acs" | "adr" | "kast" | "hsPct", digits: number) => {
    let sum = 0;
    let rounds = 0;
    for (const m of played) {
      const v = m[key];
      if (v === null) continue;
      sum += v * m.rounds;
      rounds += m.rounds;
    }
    return rounds > 0 ? round(sum / rounds, digits) : null;
  };

  // Totals and per-round rates over the maps where the count exists.
  const total = (key: "kills" | "deaths" | "assists" | "fk" | "fd") => {
    let sum = 0;
    let rounds = 0;
    for (const m of played) {
      const v = m[key];
      if (v === null) continue;
      sum += v;
      rounds += m.rounds;
    }
    return { sum, rounds };
  };
  const perRound = (t: { sum: number; rounds: number }) => (t.rounds > 0 ? round(t.sum / t.rounds, 3) : null);

  const kills = total("kills");
  const deaths = total("deaths");
  const assists = total("assists");
  const fk = total("fk");
  const fd = total("fd");

  return {
    rating: weighted("rating", 3),
    acs: weighted("acs", 1),
    kd: deaths.sum > 0 ? round(kills.sum / deaths.sum, 3) : null,
    adr: weighted("adr", 1),
    kast: weighted("kast", 1),
    // Approximate: VLR.gg's per-map HS% is rounded and is shots-based, so a
    // round-weighted average of it is only an estimate of the true HS%.
    hsPct: weighted("hsPct", 1),
    kpr: perRound(kills),
    apr: perRound(assists),
    fkpr: perRound(fk),
    fdpr: perRound(fd),
    kills: kills.sum,
    deaths: deaths.sum,
    assists: assists.sum,
    fk: fk.sum,
    fd: fd.sum,
  };
}

function windowStats(matches: PlayerMatch[], from: string): WindowStats {
  const maps = matches.filter((m) => m.date.slice(0, 10) >= from).flatMap((m) => m.maps);
  const played = statMaps(maps);

  const byAgent = new Map<string, PlayerMapResult[]>();
  for (const m of played) {
    const agent = m.agent ?? "Unknown";
    byAgent.set(agent, [...(byAgent.get(agent) ?? []), m]);
  }
  const agents: AgentWindowStats[] = [...byAgent.entries()]
    .map(([agent, agentMaps]) => ({
      agent,
      mapsPlayed: agentMaps.length,
      roundsPlayed: statMaps(agentMaps).reduce((s, m) => s + m.rounds, 0),
      stats: aggregate(agentMaps)!,
    }))
    .sort((a, b) => b.roundsPlayed - a.roundsPlayed);

  return {
    from,
    mapsPlayed: played.length,
    roundsPlayed: played.reduce((s, m) => s + m.rounds, 0),
    stats: aggregate(played),
    agents,
  };
}

function daysBefore(now: Date, days: number): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Windows are measured back from `now` (the scrape date). */
export function computeWindows(matches: PlayerMatch[], now: Date): Record<WindowKey, WindowStats> {
  const clamp = (from: string) => (from < SEASON_START ? SEASON_START : from);
  return {
    d30: windowStats(matches, clamp(daysBefore(now, 30))),
    d60: windowStats(matches, clamp(daysBefore(now, 60))),
    d90: windowStats(matches, clamp(daysBefore(now, 90))),
    season2026: windowStats(matches, SEASON_START),
  };
}
