"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Player } from "@/lib/types";
import { STATS, normalize, winner, type StatKey } from "@/lib/stats";
import { SIDE_COLORS } from "@/lib/theme";

interface Props {
  a: Player | null;
  b: Player | null;
}

interface Row {
  key: StatKey;
  label: string;
  // Player A's bar is negative so it extends left of the center line.
  a?: number;
  b?: number;
  aText?: string;
  bText?: string;
  win: "a" | "b" | null;
}

const LOSER_OPACITY = 0.3;

interface LabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string | boolean | null;
}

// Places the value just outside the bar's outer end. A negative bar's width
// can be negative, so the edges are computed rather than assumed.
function outerLabel(side: "a" | "b") {
  function OuterLabel({ x, y, width, height, value }: LabelProps) {
    if (value == null) return null;
    const left = Math.min(Number(x), Number(x) + Number(width));
    const right = Math.max(Number(x), Number(x) + Number(width));
    return (
      <text
        x={side === "a" ? left - 6 : right + 6}
        y={Number(y) + Number(height) / 2}
        textAnchor={side === "a" ? "end" : "start"}
        dominantBaseline="central"
        fill="var(--foreground)"
        fontSize={12}
      >
        {value}
      </text>
    );
  }
  return OuterLabel;
}

const ALabel = outerLabel("a");
const BLabel = outerLabel("b");

interface TooltipProps {
  active?: boolean;
  payload?: { payload: Row }[];
  a: Player | null;
  b: Player | null;
}

function BarsTooltip({ active, payload, a, b }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold">
        {row.label}
        {row.key === "fdpr" && <span className="font-normal text-muted"> (lower is better)</span>}
      </p>
      {a && (
        <p style={{ color: SIDE_COLORS.a }}>
          {a.name}: {row.aText}
          {row.win === "a" && " ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“"}
        </p>
      )}
      {b && (
        <p style={{ color: SIDE_COLORS.b }}>
          {b.name}: {row.bText}
          {row.win === "b" && " ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“"}
        </p>
      )}
    </div>
  );
}

export default function StatBars({ a, b }: Props) {
  const data: Row[] = STATS.map(({ key, label, format }) => ({
    key,
    label,
    a: a ? -normalize(key, a.stats[key]) : undefined,
    b: b ? normalize(key, b.stats[key]) : undefined,
    aText: a ? format(a.stats[key]) : undefined,
    bText: b ? format(b.stats[key]) : undefined,
    win: a && b ? winner(key, a.stats[key], b.stats[key]) : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={data.length * 40 + 20}>
      <BarChart
        data={data}
        layout="vertical"
        stackOffset="sign"
        barCategoryGap="25%"
        margin={{ top: 0, right: 48, bottom: 0, left: 48 }}
      >
        <XAxis type="number" domain={[-100, 100]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={56}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted)", fontSize: 12 }}
        />
        <ReferenceLine x={0} stroke="var(--line)" />
        <Tooltip cursor={{ fill: "var(--line)", opacity: 0.4 }} content={<BarsTooltip a={a} b={b} />} />
        <Bar dataKey="a" stackId="h2h" fill={SIDE_COLORS.a} radius={[4, 0, 0, 4]} isAnimationActive={false}>
          {data.map((row) => (
            <Cell key={row.key} fillOpacity={row.win === "b" ? LOSER_OPACITY : 1} />
          ))}
          <LabelList dataKey="aText" content={ALabel} />
        </Bar>
        <Bar dataKey="b" stackId="h2h" fill={SIDE_COLORS.b} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((row) => (
            <Cell key={row.key} fillOpacity={row.win === "a" ? LOSER_OPACITY : 1} />
          ))}
          <LabelList dataKey="bText" content={BLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
