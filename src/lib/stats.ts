import type { PlayerStats } from "./types";

export type StatKey = keyof PlayerStats;

export interface StatDef {
  key: StatKey;
  label: string;
  lowerIsBetter: boolean;
  format: (value: number) => string;
}

const fixed = (digits: number) => (v: number) => v.toFixed(digits);
const percent = (v: number) => `${v.toFixed(0)}%`;

export const STATS: StatDef[] = [
  { key: "rating", label: "Rating", lowerIsBetter: false, format: fixed(2) },
  { key: "acs", label: "ACS", lowerIsBetter: false, format: fixed(1) },
  { key: "kd", label: "K/D", lowerIsBetter: false, format: fixed(2) },
  { key: "adr", label: "ADR", lowerIsBetter: false, format: fixed(1) },
  { key: "kast", label: "KAST", lowerIsBetter: false, format: percent },
  { key: "hsPct", label: "HS%", lowerIsBetter: false, format: percent },
  { key: "kpr", label: "KPR", lowerIsBetter: false, format: fixed(2) },
  { key: "apr", label: "APR", lowerIsBetter: false, format: fixed(2) },
  { key: "fkpr", label: "FKPR", lowerIsBetter: false, format: fixed(2) },
  { key: "fdpr", label: "FDPR", lowerIsBetter: true, format: fixed(2) },
];

export const RADAR_STATS: StatKey[] = ["rating", "acs", "kd", "adr", "kast", "hsPct"];

export const STAT_BY_KEY = Object.fromEntries(STATS.map((s) => [s.key, s])) as Record<
  StatKey,
  StatDef
>;

// Typical range for a pro player, per stat. Values are mapped linearly onto
// 0–100 within this range (and clamped), so stats on very different scales
// can share one chart. Rough figures from tier-1 VCT play; adjust as needed.
export const STAT_RANGES: Record<StatKey, [min: number, max: number]> = {
  rating: [0.7, 1.4],
  acs: [150, 300],
  kd: [0.7, 1.5],
  adr: [100, 200],
  kast: [60, 85],
  hsPct: [15, 40],
  kpr: [0.5, 1.0],
  apr: [0.1, 0.5],
  fkpr: [0.05, 0.25],
  fdpr: [0.05, 0.25],
};

export function normalize(key: StatKey, value: number): number {
  const [min, max] = STAT_RANGES[key];
  const scaled = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, scaled));
}

/** Which side wins a stat, or null on a tie. */
export function winner(key: StatKey, a: number, b: number): "a" | "b" | null {
  if (a === b) return null;
  const aBetter = STAT_BY_KEY[key].lowerIsBetter ? a < b : a > b;
  return aBetter ? "a" : "b";
}
