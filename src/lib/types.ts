// Shape of a player as the UI consumes it. The scraped data below can be
// mapped onto this shape when the page is wired up to real data.

export interface PlayerStats {
  rating: number;
  acs: number;
  kd: number;
  adr: number;
  /** Percentage, 0–100 */
  kast: number;
  /** Percentage, 0–100 */
  hsPct: number;
  kpr: number;
  apr: number;
  fkpr: number;
  fdpr: number;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  country: string;
  stats: PlayerStats;
}

export type Side = "a" | "b";

// ---------------------------------------------------------------------------
// Scraped VLR.gg data (written by scripts/scrape, stored under data/)
// ---------------------------------------------------------------------------

export type Region = "americas" | "emea" | "pacific" | "china";

export interface RosterPlayer {
  id: number;
  slug: string;
  name: string;
  realName: string | null;
  /** Lowercase flag code from VLR.gg, e.g. "us" */
  countryCode: string | null;
  photoUrl: string | null;
  /** Roster tag such as "sub", or null for a regular starter */
  role: string | null;
}

export interface Team {
  id: number;
  slug: string;
  name: string;
  tag: string | null;
  region: Region;
  /** VLR.gg event ids the team was found in (empty for manual additions) */
  sourceEvents: number[];
  players: RosterPlayer[];
  rosterUpdatedAt: string | null;
}

export interface TeamsFile {
  updatedAt: string;
  teams: Team[];
}

/** One player's line on one map, "All" side values. Blank cells are null. */
export interface MapPlayerLine {
  playerId: number;
  name: string;
  teamTag: string | null;
  agent: string | null;
  rating: number | null;
  acs: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  /** Percentage, 0–100 */
  kast: number | null;
  adr: number | null;
  /** Percentage, 0–100 */
  hsPct: number | null;
  fk: number | null;
  fd: number | null;
}

export interface MatchMap {
  gameId: number;
  map: string;
  /** Team names as shown in the map header, left then right */
  teams: [string, string];
  score: [number, number];
  rounds: number;
  players: MapPlayerLine[];
}

/** Cached, parsed match page: data/matches/{matchId}.json */
export interface MatchRecord {
  matchId: number;
  url: string;
  event: string | null;
  series: string | null;
  /** UTC timestamp, ISO 8601 */
  date: string | null;
  teams: { id: number | null; name: string }[];
  maps: MatchMap[];
  updatedAt: string;
}

export interface AggregateStats {
  rating: number | null;
  acs: number | null;
  /** Total kills / total deaths */
  kd: number | null;
  adr: number | null;
  kast: number | null;
  hsPct: number | null;
  kpr: number | null;
  apr: number | null;
  fkpr: number | null;
  fdpr: number | null;
  kills: number;
  deaths: number;
  assists: number;
  fk: number;
  fd: number;
}

export interface AgentWindowStats {
  agent: string;
  mapsPlayed: number;
  roundsPlayed: number;
  stats: AggregateStats;
}

export interface WindowStats {
  /** Inclusive start date of the window (YYYY-MM-DD) */
  from: string;
  mapsPlayed: number;
  roundsPlayed: number;
  /** null when no maps were played in the window */
  stats: AggregateStats | null;
  agents: AgentWindowStats[];
}

export type WindowKey = "d30" | "d60" | "d90" | "season2026";

export interface PlayerMapResult extends Omit<MapPlayerLine, "playerId" | "name" | "teamTag"> {
  gameId: number;
  map: string;
  /** Player's team score first */
  score: [number, number] | null;
  result: "win" | "loss" | "draw" | null;
  rounds: number | null;
}

export interface PlayerMatch {
  matchId: number;
  /** ISO 8601 */
  date: string;
  event: string | null;
  series: string | null;
  team: string | null;
  opponent: string | null;
  result: "win" | "loss" | "draw" | null;
  /** Series score, player's team first */
  score: [number, number] | null;
  maps: PlayerMapResult[];
}

export interface PlayerIndexEntry {
  id: number;
  slug: string;
  name: string;
  realName: string | null;
  teamName: string;
  teamTag: string | null;
  region: Region;
  /** Country name when known, otherwise the flag code */
  country: string | null;
  photoUrl: string | null;
}

/** data/players/{id}.json */
export interface PlayerFile extends PlayerIndexEntry {
  teamId: number;
  countryCode: string | null;
  role: string | null;
  windows: Record<WindowKey, WindowStats>;
  /** Newest first */
  matches: PlayerMatch[];
  updatedAt: string;
}
