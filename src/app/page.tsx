"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import { SAMPLE_PLAYERS } from "@/lib/sampleData";
import PlayerPanel from "@/components/PlayerPanel";
import RadarCompare from "@/components/RadarCompare";
import StatBars from "@/components/StatBars";

export default function Home() {
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);
  const hasPlayer = playerA !== null || playerB !== null;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            VLR <span className="text-player-a">Compare</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Put two pro Valorant players side by side and compare their stats.
          </p>
        </div>
        <span className="rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
          Sample data · fictional players
        </span>
      </header>

      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:gap-6">
        <PlayerPanel side="a" players={SAMPLE_PLAYERS} player={playerA} onSelect={setPlayerA} />
        <div className="flex items-center justify-center text-lg font-black text-muted sm:pt-6">
          VS
        </div>
        <PlayerPanel side="b" players={SAMPLE_PLAYERS} player={playerB} onSelect={setPlayerB} />
      </div>

      {hasPlayer ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-2 text-sm font-semibold">Overview</h2>
            <RadarCompare a={playerA} b={playerB} />
          </section>
          <section className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-2 text-sm font-semibold">Head to head</h2>
            <StatBars a={playerA} b={playerB} />
          </section>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-line text-sm text-muted">
          Pick players above to see the comparison
        </div>
      )}
    </div>
  );
}
