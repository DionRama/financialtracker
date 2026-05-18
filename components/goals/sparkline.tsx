"use client";

import { useMemo } from "react";

interface Props {
  /** Eight weekly totals in cents, oldest → newest. Length should be 8. */
  weeklyCents: number[];
  color?: string;
  height?: number;
  ariaLabel?: string;
}

/**
 * Tiny pure-SVG sparkline of weekly savings contribution velocity.
 * Dep-free; themable via the goal's color.
 */
export function Sparkline({
  weeklyCents,
  color = "currentColor",
  height = 28,
  ariaLabel = "Contribution velocity (last 8 weeks)",
}: Props) {
  const bars = useMemo(() => {
    const data = weeklyCents.length === 8 ? weeklyCents : padLeft(weeklyCents, 8);
    const max = Math.max(1, ...data.map((v) => Math.abs(v)));
    return data.map((v, i) => {
      const h = Math.max(2, Math.round((Math.abs(v) / max) * (height - 4)));
      return { i, h, hasValue: v > 0 };
    });
  }, [weeklyCents, height]);

  const allZero = bars.every((b) => !b.hasValue);
  if (allZero) {
    return (
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        No contributions yet
      </p>
    );
  }

  const width = 64;
  const barWidth = 6;
  const gap = (width - barWidth * 8) / 7;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      {bars.map((b) => {
        const x = b.i * (barWidth + gap);
        const y = height - b.h;
        return (
          <rect
            key={b.i}
            x={x}
            y={y}
            width={barWidth}
            height={b.h}
            rx={1}
            fill={b.hasValue ? color : "currentColor"}
            opacity={b.hasValue ? 0.9 : 0.15}
          />
        );
      })}
    </svg>
  );
}

function padLeft(arr: number[], n: number): number[] {
  if (arr.length >= n) return arr.slice(-n);
  return [...Array(n - arr.length).fill(0), ...arr];
}
