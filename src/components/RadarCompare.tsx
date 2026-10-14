"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Player } from "@/lib/types";
import { RADAR_STATS, STAT_BY_KEY, normalize, type StatKey } from "@/lib/stats";
import { SIDE_COLORS } from "@/lib/theme";

interface Props {
  a: Player | null;
  b: Player | null;
}

interface Row {
  key: StatKey;
  label: string;
  a?: number;
  b?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: Row }[];
  a: Player | null;
  b: Player | null;
}

function RadarTooltip({ active, payload, a, b }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { key, label } = payload[0].payload;
  const { format } = STAT_BY_KEY[key];
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold">{label}</p>
      {a && (
        <p style={{ color: SIDE_COLORS.a }}>
          {a.name}: {format(a.stats[key])}
        </p>
      )}
      {b && (
        <p style={{ color: SIDE_COLORS.b }}>
          {b.name}: {format(b.stats[key])}
        </p>
      )}
    </div>
  );
}

export default function RadarCompare({ a, b }: Props) {
  const data: Row[] = RADAR_STATS.map((key) => ({
    key,
    label: STAT_BY_KEY[key].label,
    a: a ? normalize(key, a.stats[key]) : undefined,
    b: b ? normalize(key, b.stats[key]) : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="var(--line)" />
        <PolarAngleAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {a && (
          <Radar
            name={a.name}
            dataKey="a"
            stroke={SIDE_COLORS.a}
            fill={SIDE_COLORS.a}
            fillOpacity={0.25}
          />
        )}
        {b && (
          <Radar
            name={b.name}
            dataKey="b"
            stroke={SIDE_COLORS.b}
            fill={SIDE_COLORS.b}
            fillOpacity={0.25}
          />
        )}
        <Tooltip content={<RadarTooltip a={a} b={b} />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
