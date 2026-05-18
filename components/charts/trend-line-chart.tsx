"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export interface TrendPoint {
  month: string; // e.g. "Jul 2026"
  cents: number;
}

interface Props {
  data: TrendPoint[];
  currency: string;
  locale: string;
}

export function TrendLineChart({ data, currency, locale }: Props) {
  return (
    <div role="img" aria-label="Line chart of total spending across the last 6 months">
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="month"
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
          formatter={(v) => [
            formatCurrency(Number(v ?? 0), currency, locale),
            "Spent",
          ]}
        />
        <Line
          type="monotone"
          dataKey="cents"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
