import type { Player } from "./types";

// Fictional players for building the UI before the VLR.gg scraper exists.
// Names, teams and numbers are made up and do not describe real pros.
export const SAMPLE_PLAYERS: Player[] = [
  {
    id: "kestrel",
    name: "Kestrel",
    team: "Paper Lanterns",
    country: "Canada",
    stats: { rating: 1.18, acs: 238.4, kd: 1.21, adr: 154.2, kast: 74, hsPct: 27, kpr: 0.84, apr: 0.22, fkpr: 0.15, fdpr: 0.11 },
  },
  {
    id: "brightwire",
    name: "Brightwire",
    team: "Static Owls",
    country: "Sweden",
    stats: { rating: 1.07, acs: 211.9, kd: 1.09, adr: 139.5, kast: 77, hsPct: 31, kpr: 0.76, apr: 0.31, fkpr: 0.09, fdpr: 0.08 },
  },
  {
    id: "ferrox",
    name: "Ferrox",
    team: "Northbound Five",
    country: "Brazil",
    stats: { rating: 1.24, acs: 262.1, kd: 1.28, adr: 168.7, kast: 70, hsPct: 24, kpr: 0.91, apr: 0.17, fkpr: 0.21, fdpr: 0.16 },
  },
  {
    id: "lumen",
    name: "Lumen",
    team: "Tidebreakers",
    country: "South Korea",
    stats: { rating: 1.02, acs: 196.3, kd: 1.01, adr: 131.8, kast: 79, hsPct: 34, kpr: 0.71, apr: 0.38, fkpr: 0.07, fdpr: 0.07 },
  },
  {
    id: "quillon",
    name: "Quillon",
    team: "Paper Lanterns",
    country: "France",
    stats: { rating: 0.96, acs: 184.0, kd: 0.93, adr: 124.6, kast: 72, hsPct: 22, kpr: 0.67, apr: 0.29, fkpr: 0.08, fdpr: 0.10 },
  },
  {
    id: "nomadic",
    name: "Nomadic",
    team: "Static Owls",
    country: "Japan",
    stats: { rating: 1.13, acs: 229.7, kd: 1.15, adr: 148.9, kast: 75, hsPct: 29, kpr: 0.81, apr: 0.25, fkpr: 0.13, fdpr: 0.12 },
  },
];
