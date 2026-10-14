// Shape of a player as the UI consumes it. The future VLR.gg scraper should
// produce objects of this shape.

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
