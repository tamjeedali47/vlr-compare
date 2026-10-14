// Pure HTML -> data parsers for VLR.gg pages. No network access here, so each
// function can be tested against saved HTML.

import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { MapPlayerLine, MatchMap, MatchRecord, Region, RosterPlayer } from "../../src/lib/types";

const clean = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim();

/** "1.28", "69%", "+6", "" -> number | null. Blank or "-" cells become null, never 0. */
export function num(text: string | undefined | null): number | null {
  const t = clean(text).replace(/[%+]/g, "").replace("−", "-").replace("–", "-");
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function absUrl(src: string | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `https://www.vlr.gg${src}`;
  return src;
}

function idFromHref(href: string | undefined, prefix: string): { id: number; slug: string } | null {
  const m = href?.match(new RegExp(`^${prefix}/(\\d+)/([^/?#]+)`));
  return m ? { id: Number(m[1]), slug: m[2] } : null;
}

function flagCode($el: Cheerio<AnyNode>): string | null {
  const cls = $el.find("i.flag").first().attr("class") ?? "";
  const m = cls.match(/\bmod-([a-z0-9-]+)/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// VCT hub and league event pages
// ---------------------------------------------------------------------------

export interface LeagueEvent {
  id: number;
  slug: string;
  region: Region;
}

/** League events (kickoff / stages) linked from the /vct-2026 hub page. */
export function parseVctLeagueEvents(html: string, year: number): LeagueEvent[] {
  const $ = cheerio.load(html);
  const re = new RegExp(`^/event/(\\d+)/(vct-${year}-(americas|emea|pacific|china)-[^/?#]+)`);
  const seen = new Map<number, LeagueEvent>();
  $("a[href^='/event/']").each((_, a) => {
    const m = $(a).attr("href")?.match(re);
    if (m) seen.set(Number(m[1]), { id: Number(m[1]), slug: m[2], region: m[3] as Region });
  });
  return [...seen.values()];
}

export interface EventTeam {
  id: number;
  slug: string;
  name: string;
}

export function parseEventTeams(html: string): EventTeam[] {
  const $ = cheerio.load(html);
  const teams = new Map<number, EventTeam>();
  $("a.event-team-name").each((_, a) => {
    const ref = idFromHref($(a).attr("href"), "/team");
    if (ref) teams.set(ref.id, { ...ref, name: clean($(a).text()) });
  });
  return [...teams.values()];
}

// ---------------------------------------------------------------------------
// Team page
// ---------------------------------------------------------------------------

export interface TeamPage {
  name: string;
  tag: string | null;
  players: RosterPlayer[];
}

const PLACEHOLDER_PHOTO = "/img/base/ph/sil.png";

export function parseTeamPage(html: string): TeamPage {
  const $ = cheerio.load(html);
  const players: RosterPlayer[] = [];

  $(".team-roster-item").each((_, item) => {
    const $item = $(item);
    // Each roster group is a ".wf-module-label" ("players" / "staff") followed
    // by a flex container holding the items.
    const section = clean($item.parent().prevAll(".wf-module-label").first().text()).toLowerCase();
    if (section !== "players") return;

    const role = clean($item.find(".team-roster-item-name-role").text()).toLowerCase() || null;
    if (role?.includes("inactive")) return;

    const ref = idFromHref($item.find("a").attr("href"), "/player");
    if (!ref) return;
    const $alias = $item.find(".team-roster-item-name-alias");
    const src = $item.find(".team-roster-item-img img").attr("src");

    players.push({
      id: ref.id,
      slug: ref.slug,
      name: clean($alias.text()),
      realName: clean($item.find(".team-roster-item-name-real").text()) || null,
      countryCode: flagCode($alias),
      photoUrl: src && src !== PLACEHOLDER_PHOTO ? absUrl(src) : null,
      role,
    });
  });

  return {
    name: clean($(".team-header-name h1").first().text()),
    tag: clean($(".team-header-tag").first().text()) || null,
    players,
  };
}

// ---------------------------------------------------------------------------
// Player match history: /player/matches/{id}/{slug}?page=N
// ---------------------------------------------------------------------------

export interface HistoryGame {
  gameId: number;
  map: string;
  agent: string | null;
  /** Player's team first */
  score: [number, number] | null;
  result: "win" | "loss" | "draw" | null;
}

export interface HistoryMatch {
  matchId: number;
  path: string;
  /** YYYY-MM-DD as shown on the page */
  date: string | null;
  event: string | null;
  team: string | null;
  opponent: string | null;
  result: "win" | "loss" | "draw" | null;
  score: [number, number] | null;
  games: HistoryGame[];
}

export interface HistoryPage {
  matches: HistoryMatch[];
  hasNextPage: boolean;
}

function resultFromClass(cls: string | undefined): "win" | "loss" | "draw" | null {
  if (!cls) return null;
  if (/\bmod-win\b/.test(cls)) return "win";
  if (/\bmod-loss\b/.test(cls)) return "loss";
  if (/\bmod-draw\b/.test(cls)) return "draw";
  return null;
}

function parseScore(text: string): [number, number] | null {
  const m = clean(text).match(/(\d+)\s*[-:]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function parseMatchHistory(html: string): HistoryPage {
  const $ = cheerio.load(html);
  const matches: HistoryMatch[] = [];

  $("a.m-item").each((_, a) => {
    const $a = $(a);
    const path = $a.attr("href") ?? "";
    const idMatch = path.match(/^\/(\d+)\//);
    if (!idMatch) return;

    const $result = $a.find(".m-item-result");
    const scores = $result.find("span").map((_, s) => num($(s).text())).get() as (number | null)[];
    const internalId = $result.attr("data-match-id");
    const rawDate = clean($a.find(".m-item-date > div").first().text());
    const dm = rawDate.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    const teamNames = $a.find(".m-item-team-name").map((_, t) => clean($(t).text())).get();

    const games: HistoryGame[] = [];
    if (internalId) {
      $(`.m-item-games.match-id-${internalId} a.m-item-games-item`).each((_, g) => {
        const $g = $(g);
        const gm = ($g.attr("href") ?? "").match(/[?&]game=(\d+)/);
        if (!gm) return;
        const $res = $g.find(".m-item-games-result");
        games.push({
          gameId: Number(gm[1]),
          map: clean($res.find(".map").text()),
          agent: $g.find(".m-item-games-comp-group img").attr("title") ?? null,
          score: parseScore($res.find(".score").text()),
          result: resultFromClass($res.attr("class")),
        });
      });
    }

    matches.push({
      matchId: Number(idMatch[1]),
      path: path.split("?")[0],
      date: dm ? `${dm[1]}-${dm[2]}-${dm[3]}` : null,
      event: clean($a.find(".m-item-event > div").first().text()) || null,
      team: teamNames[0] ?? null,
      opponent: teamNames[1] ?? null,
      result: resultFromClass($result.attr("class")),
      score: scores.length >= 2 && scores[0] !== null && scores[1] !== null ? [scores[0], scores[1]] : null,
      games,
    });
  });

  const current = Number(clean($(".action-container-pages .mod-active").first().text())) || 1;
  const pages = $(".action-container-pages a.mod-page")
    .map((_, p) => Number(clean($(p).text())))
    .get()
    .filter((n: number) => Number.isFinite(n));
  return { matches, hasNextPage: pages.some((p: number) => p > current) };
}

// ---------------------------------------------------------------------------
// Match page: /{matchId}/{slug}
// ---------------------------------------------------------------------------

function sideValue($row: Cheerio<AnyNode>, col: string): number | null {
  return num($row.find(`[data-col="${col}"] .side.mod-both`).first().text());
}

function parseMapPlayers($: CheerioAPI, $game: Cheerio<AnyNode>): MapPlayerLine[] {
  const lines: MapPlayerLine[] = [];
  $game.find(".ovw-row").not(".mod-head").each((_, row) => {
    const $row = $(row);
    const ref = idFromHref($row.find("a[href^='/player/']").attr("href"), "/player");
    if (!ref) return;
    lines.push({
      playerId: ref.id,
      name: clean($row.find(".ovw-player-name").text()),
      teamTag: clean($row.find(".ovw-player-tag").text()) || null,
      agent: $row.find(".ovw-agents img").first().attr("title") ?? null,
      rating: sideValue($row, "rating2"),
      acs: sideValue($row, "acs"),
      kills: sideValue($row, "kills"),
      deaths: sideValue($row, "deaths"),
      assists: sideValue($row, "assists"),
      kast: sideValue($row, "kast"),
      adr: sideValue($row, "adr"),
      hsPct: sideValue($row, "hsp"),
      fk: sideValue($row, "fb"),
      fd: sideValue($row, "fd"),
    });
  });
  return lines;
}

export function parseMatchPage(html: string, matchId: number, url: string, now: string): MatchRecord {
  const $ = cheerio.load(html);

  const utc = $(".match-header-date .moment-tz-convert[data-utc-ts]").first().attr("data-utc-ts");
  const date = utc && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(utc) ? `${utc.replace(" ", "T")}Z` : null;

  const teams = $("a.match-header-link")
    .map((_, a) => ({
      id: idFromHref($(a).attr("href"), "/team")?.id ?? null,
      name: clean($(a).find(".match-header-link-name .wf-title-med").text()),
    }))
    .get();

  const maps: MatchMap[] = [];
  $(".vm-stats-game").each((_, g) => {
    const $game = $(g);
    const gameId = $game.attr("data-game-id");
    if (!gameId || gameId === "all") return;

    const players = parseMapPlayers($, $game);
    if (players.length === 0) return; // map not played

    const $header = $game.find(".vm-stats-game-header");
    const $mapName = $header.find(".map-name").first().clone();
    $mapName.find(".picked").remove();
    const scores = $header.find(".team .score").map((_, s) => num($(s).text())).get() as (number | null)[];
    const names = $header.find(".team .team-name").map((_, n) => clean($(n).text())).get();
    const score: [number, number] = [scores[0] ?? 0, scores[1] ?? 0];

    maps.push({
      gameId: Number(gameId),
      map: clean($mapName.text()),
      teams: [names[0] ?? "", names[1] ?? ""],
      score,
      rounds: score[0] + score[1],
      players,
    });
  });

  return {
    matchId,
    url,
    event: clean($(".match-header-event > div > div").first().text()) || null,
    series: clean($(".match-header-event-series").first().text()) || null,
    date,
    teams,
    maps,
    updatedAt: now,
  };
}
