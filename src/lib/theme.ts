import type { Side } from "./types";

// Player accent colors for charts. Keep in sync with --color-player-a/b in
// globals.css, which the Tailwind classes use.
export const SIDE_COLORS: Record<Side, string> = {
  a: "#ff4655",
  b: "#2dd4bf",
};

// Static class names so Tailwind can see them at build time.
export const SIDE_CLASSES: Record<Side, { text: string; border: string; bg: string; ring: string }> = {
  a: {
    text: "text-player-a",
    border: "border-player-a",
    bg: "bg-player-a",
    ring: "focus:ring-player-a",
  },
  b: {
    text: "text-player-b",
    border: "border-player-b",
    bg: "bg-player-b",
    ring: "focus:ring-player-b",
  },
};
