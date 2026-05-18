"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export interface DailySpendPoint {
  day: string; // e.g. "12"
  date: string; // ISO
  cents: number;
}

interface Props {
  data: DailySpendPoint[];
  currency: string;
  locale: string;
}

export function DailySpendChart({ data, currency, locale }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart
        data={data}
        margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border)"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <YAxis
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={56}
          tickFormatter={(v: number) =>
            formatCompactCurrency(Number(v), currency, locale)
          }
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--color-muted-foreground)" }}
          formatter={(v) => [
            formatCurrency(Number(v ?? 0), currency, locale),
            "Spent",
          ]}
        />
        <Area
          type="monotone"
          dataKey="cents"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#dailyFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
