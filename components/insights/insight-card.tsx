"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/insights";

const ICONS = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
} as const;

const TONE = {
  critical: "text-destructive",
  warning: "text-amber-500",
  info: "text-muted-foreground",
} as const;

interface InsightCardProps {
  insight: Insight;
  className?: string;
}

export function InsightCard({ insight, className }: InsightCardProps) {
  const Icon = ICONS[insight.severity];
  const tone = TONE[insight.severity];
  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-3 p-4">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{insight.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{insight.body}</p>
          {insight.actionHref ? (
            <Link
              href={insight.actionHref}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Go <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
