import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const DATA_DIR = join(process.cwd(), "data");
export const PLAYERS_DIR = join(DATA_DIR, "players");
export const MATCHES_DIR = join(DATA_DIR, "matches");
export const TEAMS_FILE = join(DATA_DIR, "teams.json");
export const TEAMS_OVERRIDE_FILE = join(process.cwd(), "scripts", "config", "teams.override.json");

export function readJson<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Pretty JSON for small, hand-checked files; compact for bulk data. */
export function writeJson(path: string, data: unknown, pretty = false): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, pretty ? 2 : undefined) + "\n");
}

export function listJsonIds(dir: string): number[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => f.match(/^(\d+)\.json$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => Number(m[1]));
}

export const playerPath = (id: number) => join(PLAYERS_DIR, `${id}.json`);
export const matchPath = (id: number) => join(MATCHES_DIR, `${id}.json`);
