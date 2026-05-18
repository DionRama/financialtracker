"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { formatMonthLabel, isoMonthFromDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthFromString(s: string | null): string {
  if (s && /^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  return isoMonthFromDate(new Date());
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function MonthSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const selected = monthFromString(params.get("month"));
  const currentMonth = isoMonthFromDate(new Date());
  const [selectedYear, selectedMonthIdx] = (() => {
    const [y, m] = selected.split("-").map(Number);
    return [y, (m ?? 1) - 1];
  })();
  const [currentYear, currentMonthIdx] = (() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return [y, (m ?? 1) - 1];
  })();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);

  useEffect(() => {
    if (open) setViewYear(selectedYear);
  }, [open, selectedYear]);

  function navigate(month: string) {
    const sp = new URLSearchParams(params.toString());
    if (month === currentMonth) sp.delete("month");
    else sp.set("month", month.slice(0, 7));
    const qs = sp.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}` as const);
  }

  function shift(delta: number) {
    const d = new Date(Date.UTC(selectedYear, selectedMonthIdx + delta, 1));
    navigate(isoMonthFromDate(d));
  }

  function pickMonth(year: number, monthIdx: number) {
    navigate(`${year}-${pad2(monthIdx + 1)}-01`);
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-1 rounded-md border bg-card px-1 py-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        aria-label="Previous month"
        onClick={() => shift(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="min-w-[8rem] rounded px-2 py-1 text-sm font-medium tabular-nums hover:bg-accent"
            aria-label="Pick a month"
          >
            {formatMonthLabel(selected)}
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-64 p-3">
          <div className="mb-2 flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label="Previous year"
              onClick={() => setViewYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold tabular-nums">
              {viewYear}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label="Next year"
              onClick={() => setViewYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_LABELS.map((label, idx) => {
              const isSelected =
                viewYear === selectedYear && idx === selectedMonthIdx;
              const isToday =
                viewYear === currentYear && idx === currentMonthIdx;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pickMonth(viewYear, idx)}
                  className={cn(
                    "h-9 rounded-md text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent",
                    !isSelected && isToday && "ring-1 ring-ring",
                  )}
                  aria-pressed={isSelected}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                navigate(currentMonth);
                setOpen(false);
              }}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        aria-label="Next month"
        onClick={() => shift(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
