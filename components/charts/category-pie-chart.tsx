"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "@/lib/format";

export interface CategorySlice {
  category_id: string;
  name: string;
  color: string;
  cents: number;
}

interface Props {
  data: CategorySlice[];
  currency: string;
  locale: string;
}

export function CategoryPieChart({ data, currency, locale }: Props) {
  if (data.length === 0) {
    return (
      <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
        No spend yet this month.
      </div>
    );
  }
  return (
    <div role="img" aria-label="Donut chart of spending by category for the selected month">
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="cents"
          nameKey="name"
          innerRadius={55}
          outerRadius={95}
          stroke="var(--color-background)"
          strokeWidth={2}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.category_id} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v, name) => [
            formatCurrency(Number(v ?? 0), currency, locale),
            name as string,
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}
