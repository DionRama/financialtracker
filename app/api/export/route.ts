import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/queries/month";
import { getPeriodStartDay } from "@/lib/period-server";

export const runtime = "nodejs";

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

interface ExpenseRow {
  amount_cents: number;
  occurred_at: string;
  note: string | null;
  tags: string[] | null;
  categories: { name: string | null } | { name: string | null }[] | null;
}

function categoryName(cat: ExpenseRow["categories"]): string {
  if (!cat) return "";
  if (Array.isArray(cat)) return cat[0]?.name ?? "";
  return cat.name ?? "";
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const categoryId = url.searchParams.get("category_id");

  const periodStartDay = await getPeriodStartDay();
  const { isoMonth, startDate, endDate } = monthBounds(monthParam, periodStartDay);
  const monthLabel = isoMonth.slice(0, 7); // YYYY-MM

  let query = supabase
    .from("expenses")
    .select("amount_cents, occurred_at, note, tags, categories(name)")
    .eq("user_id", user.id)
    .gte("occurred_at", startDate)
    .lt("occurred_at", endDate)
    .order("occurred_at", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }

  const rows = (data ?? []) as unknown as ExpenseRow[];

  const header = ["date", "category", "amount", "note", "tags"].join(",");
  const body = rows
    .map((r) => {
      const date = (r.occurred_at ?? "").slice(0, 10);
      const cat = categoryName(r.categories);
      const amount = formatAmount(r.amount_cents);
      const note = r.note ?? "";
      const tags = Array.isArray(r.tags) ? r.tags.join(",") : "";
      return [
        escapeCsv(date),
        escapeCsv(cat),
        escapeCsv(amount),
        escapeCsv(note),
        escapeCsv(tags),
      ].join(",");
    })
    .join("\n");

  const csv = body ? `${header}\n${body}\n` : `${header}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${monthLabel}.csv"`,
    },
  });
}
