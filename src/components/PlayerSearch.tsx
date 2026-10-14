"use client";

import { useState } from "react";
import type { Player, Side } from "@/lib/types";
import { SIDE_CLASSES } from "@/lib/theme";

interface Props {
  side: Side;
  players: Player[];
  onSelect: (player: Player) => void;
}

export default function PlayerSearch({ side, players, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const classes = SIDE_CLASSES[side];

  const q = query.trim().toLowerCase();
  const matches = players.filter(
    (p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q),
  );

  function choose(player: Player) {
    onSelect(player);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        placeholder={`Search Player ${side.toUpperCase()}…`}
        aria-label={`Search Player ${side.toUpperCase()}`}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches.length > 0) choose(matches[0]);
          if (e.key === "Escape") setOpen(false);
        }}
        className={`w-full rounded-lg border-2 ${classes.border} bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:ring-2 ${classes.ring}`}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-surface shadow-xl">
          {matches.length === 0 ? (
            <li className="px-4 py-2 text-sm text-muted">No players found</li>
          ) : (
            matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  // mousedown fires before the input's blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  className="flex w-full items-baseline justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-line"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted">{p.team}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
