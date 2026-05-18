import "server-only";

import type { Insight } from "./index";
import { upsertNotification } from "@/lib/actions/notifications";

export async function persistInsights(insights: Insight[]): Promise<void> {
  if (!insights.length) return;
  await Promise.all(
    insights.map((insight) =>
      upsertNotification({
        kind: insight.kind,
        severity: insight.severity,
        dedupe_key: insight.id,
        payload: {
          title: insight.title,
          body: insight.body,
          actionHref: insight.actionHref,
          ...insight.payload,
        },
      }).catch(() => {
        // Idempotent best-effort: swallow individual failures so a single bad
        // insight doesn't break the dashboard render.
      }),
    ),
  );
}
