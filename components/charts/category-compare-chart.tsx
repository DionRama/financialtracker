"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export interface CategoryCompareRow {
  category: string;
  current: number;
  previous: number;
}

interface Props {
  data: CategoryCompareRow[];
  currency: string;
  locale: string;
}

export function CategoryCompareChart({ data, currency, locale }: Props) {
  return (
    <div role="img" aria-label="Bar chart comparing this month's spending to last month for top categories">
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="category"
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
          formatter={(v) => formatCurrency(Number(v ?? 0), currency, locale)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="previous"
          name="Previous month"
          fill="var(--color-muted-foreground)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="current"
          name="This month"
          fill="var(--color-chart-1)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
