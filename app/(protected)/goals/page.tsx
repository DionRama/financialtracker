import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { GoalsView, type GoalRow } from "@/components/goals/goals-view";

export const metadata = { title: "Savings goals" };

interface GoalRowFromDb {
  id: string;
  name: string;
  target_cents: number;
  saved_cents: number;
  deadline: string | null;
  color: string;
  emoji: string | null;
}

interface ContribRow {
  id: string;
  goal_id: string;
  amount_cents: number;
  occurred_at: string;
  note: string | null;
}

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Look back 8 full weeks (56 days) for the sparkline.
  const since = new Date();
  since.setDate(since.getDate() - 56);
  const sinceIso = since.toISOString();

  const [{ data: goalsRaw }, { data: profile }, { data: contribsRaw }] =
    await Promise.all([
      supabase
        .from("savings_goals")
        .select("id, name, target_cents, saved_cents, deadline, color, emoji")
        .eq("is_archived", false)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("currency, locale")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("goal_contributions")
        .select("id, goal_id, amount_cents, occurred_at, note")
        .gte("occurred_at", sinceIso)
        .order("occurred_at", { ascending: false }),
    ]);

  const goalsList = (goalsRaw ?? []) as GoalRowFromDb[];
  const contribs = (contribsRaw ?? []) as ContribRow[];

  // Build weekly buckets per goal (8 buckets, oldest → newest).
  const weekStart = startOfWeek(new Date());
  const buckets: Record<string, number[]> = {};
  const recent: Record<string, ContribRow[]> = {};

  for (const g of goalsList) {
    buckets[g.id] = new Array(8).fill(0);
    recent[g.id] = [];
  }

  for (const c of contribs) {
    const dt = new Date(c.occurred_at);
    const diffMs = weekStart.getTime() - startOfWeek(dt).getTime();
    const weeksBack = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    if (weeksBack >= 0 && weeksBack < 8) {
      const idx = 7 - weeksBack;
      const arr = buckets[c.goal_id];
      if (arr && c.amount_cents > 0) arr[idx] += c.amount_cents;
    }
    const list = recent[c.goal_id];
    if (list && list.length < 5) list.push(c);
  }

  const goals: GoalRow[] = goalsList.map((g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    color: g.color,
    target_cents: g.target_cents,
    saved_cents: g.saved_cents,
    deadline: g.deadline,
    weekly_velocity: buckets[g.id] ?? new Array(8).fill(0),
    recent_contributions: (recent[g.id] ?? []).map((c) => ({
      id: c.id,
      amount_cents: c.amount_cents,
      occurred_at: c.occurred_at,
      note: c.note,
    })),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Savings goals"
        description="Track progress toward what matters."
      />
      <GoalsView
        goals={goals}
        currency={profile?.currency ?? "USD"}
        locale={profile?.locale ?? "en-US"}
      />
    </div>
  );
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // ISO week starts Monday
  x.setDate(x.getDate() - diff);
  return x;
}
