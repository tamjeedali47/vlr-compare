import type { Player, Side } from "@/lib/types";
import { SIDE_CLASSES } from "@/lib/theme";

interface Props {
  side: Side;
  player: Player | null;
}

export default function PlayerCard({ side, player }: Props) {
  const classes = SIDE_CLASSES[side];

  if (!player) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-line text-sm text-muted">
        Search for a player
      </div>
    );
  }

  return (
    <div className={`flex h-32 items-center gap-4 rounded-xl border-2 ${classes.border} bg-surface p-4`}>
      <div
        aria-hidden
        className={`flex size-16 shrink-0 items-center justify-center rounded-full ${classes.bg} text-2xl font-bold text-background`}
      >
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className={`truncate text-xl font-bold ${classes.text}`}>{player.name}</p>
        <p className="truncate text-sm text-foreground">{player.team}</p>
        <p className="truncate text-xs text-muted">{player.country}</p>
      </div>
    </div>
  );
}
