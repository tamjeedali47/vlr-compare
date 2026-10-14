// VLR.gg scraper entry point: `npm run scrape [-- --team <slug>] [-- --refresh-rosters]`
//
// 1. Finds the VCT 2026 partnered teams and their rosters (data/teams.json).
// 2. Pages through each player's match history back to the season start.
// 3. Fetches every match page not yet cached (data/matches/{id}.json).
// 4. Writes each player's matches and stat windows (data/players/{id}.json)
//    and a search index (data/players/index.json).

import { parseArgs } from "node:util";
import type {
  MatchRecord,
  PlayerFile,
  PlayerIndexEntry,
  PlayerMatch,
  Region,
  RosterPlayer,
  Team,
  TeamsFile,
} from "../../src/lib/types";
import { SEASON_START, buildPlayerMatch, computeWindows } from "./aggregate";
import { BASE_URL, fetchHtml, requestCount } from "./http";
import {
  type HistoryMatch,
  parseEventTeams,
  parseMatchHistory,
  parseMatchPage,
  parseTeamPage,
  parseVctLeagueEvents,
} from "./parse";
import {
  DATA_DIR,
  MATCHES_DIR,
  PLAYERS_DIR,
  TEAMS_FILE,
  TEAMS_OVERRIDE_FILE,
  listJsonIds,
  matchPath,
  playerPath,
  readJson,
  writeJson,
} from "./storage";

const SEASON_YEAR = 2026;
/** Re-fetch a cached match with no stats if it is this recent (stats may be posted late). */
const EMPTY_MATCH_RETRY_DAYS = 3;

interface Failure {
  kind: "team" | "player" | "match";
  id: number | string;
  error: string;
}

interface TeamsOverride {
  add?: { id: number; slug: string; region: Region }[];
  remove?: number[];
}

const failures: Failure[] = [];
const fail = (kind: Failure["kind"], id: number | string, err: unknown) => {
  const error = err instanceof Error ? err.message : String(err);
  failures.push({ kind, id, error });
  console.warn(`  ✗ ${kind} ${id}: ${error}`);
};

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    const name = countryNames.of(code.toUpperCase());
    return name && name !== code.toUpperCase() ? name : code;
  } catch {
    return code;
  }
}

// ---------------------------------------------------------------------------
// Teams and rosters
// ---------------------------------------------------------------------------

async function discoverTeams(): Promise<Map<number, Team>> {
  console.log(`Finding VCT ${SEASON_YEAR} league events…`);
  const events = parseVctLeagueEvents(await fetchHtml(`/vct-${SEASON_YEAR}`), SEASON_YEAR);
  console.log(`  ${events.length} league events: ${events.map((e) => e.slug).join(", ")}`);

  const teams = new Map<number, Team>();
  for (const event of events) {
    try {
      const found = parseEventTeams(await fetchHtml(`/event/${event.id}/${event.slug}`));
      for (const t of found) {
        const existing = teams.get(t.id);
        if (existing) existing.sourceEvents.push(event.id);
        else
          teams.set(t.id, {
            id: t.id,
            slug: t.slug,
            name: t.name,
            tag: null,
            region: event.region,
            sourceEvents: [event.id],
            players: [],
            rosterUpdatedAt: null,
          });
      }
      console.log(`  ${event.slug}: ${found.length} teams`);
    } catch (err) {
      fail("team", `event ${event.id}`, err);
    }
  }

  const override = readJson<TeamsOverride>(TEAMS_OVERRIDE_FILE) ?? {};
  for (const add of override.add ?? []) {
    if (!teams.has(add.id))
      teams.set(add.id, { ...add, name: add.slug, tag: null, sourceEvents: [], players: [], rosterUpdatedAt: null });
  }
  for (const id of override.remove ?? []) teams.delete(id);
  return teams;
}

async function loadTeams(refresh: boolean, onlySlug: string | undefined): Promise<Team[]> {
  const previous = readJson<TeamsFile>(TEAMS_FILE);
  const prevById = new Map(previous?.teams.map((t) => [t.id, t]) ?? []);
  const needsDiscovery = refresh || !previous;

  let teams: Team[];
  if (needsDiscovery) {
    const discovered = await discoverTeams();
    // Keep previously scraped rosters until they are refreshed below.
    teams = [...discovered.values()].map((t) => {
      const prev = prevById.get(t.id);
      return prev ? { ...t, name: prev.name, tag: prev.tag, players: prev.players, rosterUpdatedAt: prev.rosterUpdatedAt } : t;
    });
  } else {
    teams = previous.teams;
  }

  const regionOrder: Region[] = ["americas", "emea", "pacific", "china"];
  teams.sort((a, b) => regionOrder.indexOf(a.region) - regionOrder.indexOf(b.region) || a.name.localeCompare(b.name));

  for (const team of teams) {
    if (onlySlug && team.slug !== onlySlug) continue;
    if (!refresh && team.rosterUpdatedAt) continue;
    try {
      const page = parseTeamPage(await fetchHtml(`/team/${team.id}/${team.slug}`));
      team.name = page.name || team.name;
      team.tag = page.tag;
      team.players = page.players;
      team.rosterUpdatedAt = new Date().toISOString();
      console.log(`  roster ${team.name} (${team.region}): ${page.players.map((p) => p.name).join(", ")}`);
    } catch (err) {
      fail("team", team.slug, err);
    }
  }

  writeJson(TEAMS_FILE, { updatedAt: new Date().toISOString(), teams } satisfies TeamsFile, true);
  return teams;
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

/** Rebuilds the history rows from a previously written player file. */
function historyFromPlayerFile(file: PlayerFile | undefined): HistoryMatch[] {
  return (file?.matches ?? []).map((m) => ({
    matchId: m.matchId,
    path: `/${m.matchId}`,
    date: m.date.slice(0, 10),
    event: m.event,
    team: m.team,
    opponent: m.opponent,
    result: m.result,
    score: m.score,
    games: m.maps.map((g) => ({ gameId: g.gameId, map: g.map, agent: g.agent, score: g.score, result: g.result })),
  }));
}

async function fetchHistory(player: RosterPlayer, knownIds: Set<number>): Promise<HistoryMatch[]> {
  const rows: HistoryMatch[] = [];
  for (let page = 1; ; page++) {
    const html = await fetchHtml(`/player/matches/${player.id}/${player.slug}/?page=${page}`);
    const { matches, hasNextPage } = parseMatchHistory(html);
    const inSeason = matches.filter((m) => m.date !== null && m.date >= SEASON_START);
    rows.push(...inSeason);
    const reachedOldSeason = inSeason.length < matches.length;
    // Incremental: once a page overlaps what we stored last time, older pages are known.
    const reachedKnown = matches.some((m) => knownIds.has(m.matchId));
    if (!hasNextPage || reachedOldSeason || reachedKnown || matches.length === 0) break;
  }
  return rows;
}

const matchCache = new Map<number, MatchRecord>();
let matchesFetched = 0;

async function getMatch(row: HistoryMatch): Promise<MatchRecord | undefined> {
  const cached = matchCache.get(row.matchId) ?? readJson<MatchRecord>(matchPath(row.matchId));
  const ageDays = row.date ? (Date.now() - Date.parse(row.date)) / 86_400_000 : Infinity;
  if (cached && (cached.maps.length > 0 || ageDays > EMPTY_MATCH_RETRY_DAYS)) {
    matchCache.set(row.matchId, cached);
    return cached;
  }
  try {
    const url = new URL(row.path, BASE_URL).toString();
    const record = parseMatchPage(await fetchHtml(row.path), row.matchId, url, new Date().toISOString());
    if (record.maps.length === 0) console.warn(`  ? match ${row.matchId} has no map stats`);
    writeJson(matchPath(row.matchId), record);
    matchCache.set(row.matchId, record);
    matchesFetched++;
    return record;
  } catch (err) {
    fail("match", row.matchId, err);
    return cached;
  }
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

function indexEntry(team: Team, p: RosterPlayer): PlayerIndexEntry {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    realName: p.realName,
    teamName: team.name,
    teamTag: team.tag,
    region: team.region,
    country: countryName(p.countryCode),
    photoUrl: p.photoUrl,
  };
}

async function scrapePlayer(team: Team, player: RosterPlayer, now: Date): Promise<void> {
  const previous = readJson<PlayerFile>(playerPath(player.id));
  const known = historyFromPlayerFile(previous);
  const fresh = await fetchHistory(player, new Set(known.map((m) => m.matchId)));

  // Fresh rows win over stored ones; stored ones fill in older history.
  const rows = new Map<number, HistoryMatch>();
  for (const m of [...known, ...fresh]) rows.set(m.matchId, m);

  const matches: PlayerMatch[] = [];
  for (const row of rows.values()) {
    matches.push(buildPlayerMatch(player.id, row, await getMatch(row)));
  }
  matches.sort((a, b) => b.date.localeCompare(a.date) || b.matchId - a.matchId);

  const file: PlayerFile = {
    ...indexEntry(team, player),
    teamId: team.id,
    countryCode: player.countryCode,
    role: player.role,
    windows: computeWindows(matches, now),
    matches,
    updatedAt: now.toISOString(),
  };
  writeJson(playerPath(player.id), file);
  const s = file.windows.season2026;
  console.log(
    `    ${player.name}: ${fresh.length} history rows, ${matches.length} matches, ${s.mapsPlayed} maps, rating ${s.stats?.rating ?? "–"}`,
  );
}

// ---------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      team: { type: "string" },
      "refresh-rosters": { type: "boolean", default: false },
    },
  });
  const started = new Date();
  console.log(`VLR.gg scrape started ${started.toISOString()} (data dir: ${DATA_DIR})`);

  const teams = await loadTeams(values["refresh-rosters"] ?? false, values.team);
  const selected = values.team ? teams.filter((t) => t.slug === values.team) : teams;
  if (values.team && selected.length === 0) {
    throw new Error(`No team with slug "${values.team}". Known: ${teams.map((t) => t.slug).join(", ")}`);
  }

  const totalPlayers = selected.reduce((n, t) => n + t.players.length, 0);
  let done = 0;
  for (const [i, team] of selected.entries()) {
    console.log(`[team ${i + 1}/${selected.length}] ${team.name} (${team.region})`);
    for (const player of team.players) {
      done++;
      console.log(`  [player ${done}/${totalPlayers}] ${player.name}`);
      try {
        await scrapePlayer(team, player, started);
      } catch (err) {
        fail("player", `${player.id} ${player.name}`, err);
      }
    }
  }

  // Search index: every rostered player that has a data file.
  const withData = new Set(listJsonIds(PLAYERS_DIR));
  const index = teams.flatMap((t) => t.players.filter((p) => withData.has(p.id)).map((p) => indexEntry(t, p)));
  writeJson(`${PLAYERS_DIR}/index.json`, index, true);

  const finished = new Date();
  const summary = {
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    durationSec: Math.round((finished.getTime() - started.getTime()) / 1000),
    options: values,
    requests: requestCount,
    teams: selected.length,
    players: totalPlayers,
    indexedPlayers: index.length,
    matchesFetched,
    matchesCached: listJsonIds(MATCHES_DIR).length,
    failures,
  };
  writeJson(`${DATA_DIR}/last-run.json`, summary, true);
  console.log(
    `Done in ${summary.durationSec}s: ${summary.requests} requests, ${matchesFetched} new matches, ` +
      `${summary.matchesCached} cached, ${failures.length} failures.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
