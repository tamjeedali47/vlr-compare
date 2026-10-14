import type { Player, Side } from "@/lib/types";
import { SIDE_CLASSES } from "@/lib/theme";
import PlayerSearch from "./PlayerSearch";
import PlayerCard from "./PlayerCard";

interface Props {
  side: Side;
  players: Player[];
  player: Player | null;
  onSelect: (player: Player) => void;
}

export default function PlayerPanel({ side, players, player, onSelect }: Props) {
  return (
    <section className="flex flex-1 flex-col gap-3">
      <h2 className={`text-xs font-semibold tracking-widest uppercase ${SIDE_CLASSES[side].text}`}>
        Player {side.toUpperCase()}
      </h2>
      <PlayerSearch side={side} players={players} onSelect={onSelect} />
      <PlayerCard side={side} player={player} />
    </section>
  );
}
