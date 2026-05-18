import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean } | null;
  hint?: string;
  className?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  className,
}: KpiCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="font-tabular text-2xl font-semibold tracking-tight sm:text-3xl">
          {value}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {hint ? <span>{hint}</span> : <span />}
          {delta ? (
            <span
              className={cn(
                "font-medium",
                delta.positive ? "text-destructive" : "text-success",
              )}
            >
              {delta.value}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
