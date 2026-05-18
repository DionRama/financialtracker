"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseAmountToCents } from "@/lib/format";
import {
  applyBudgetSuggestions,
  autoBalanceBudgetsToIncome,
  copyBudgetsFromPreviousMonth,
  suggestBudgetsFromLast3Months,
} from "@/lib/actions/budgets";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Props {
  month: string;
  categories: Category[];
  monthlyIncomeCents: number | null;
}

interface SuggestionRow {
  category_id: string;
  amount_cents: number;
}

export function SmartBudgetsActions({
  month,
  categories,
  monthlyIncomeCents,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<
    null | { title: string; suggestions: SuggestionRow[] }
  >(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const catById = new Map(categories.map((c) => [c.id, c]));

  function copyLast() {
    startTransition(async () => {
      try {
        const n = await copyBudgetsFromPreviousMonth(month);
        toast.success(
          n
            ? `Copied ${n} budget${n === 1 ? "" : "s"} from last month`
            : "No budgets to copy",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function loadSuggest() {
    startTransition(async () => {
      try {
        const rows = await suggestBudgetsFromLast3Months(month);
        if (rows.length === 0) {
          toast.message("No spend history in last 3 months.");
          return;
        }
        openDialog("Suggested budgets (last 3 months avg)", rows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function loadAutoBalance() {
    if (!monthlyIncomeCents || monthlyIncomeCents <= 0) {
      toast.error("Set a monthly income in Settings first.");
      return;
    }
    startTransition(async () => {
      try {
        const rows = await autoBalanceBudgetsToIncome(month, monthlyIncomeCents);
        if (rows.length === 0) {
          toast.message("No spend history to balance against.");
          return;
        }
        openDialog("Auto-balance to income", rows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function openDialog(title: string, rows: SuggestionRow[]) {
    setDialog({ title, suggestions: rows });
    const next: Record<string, string> = {};
    for (const r of rows) {
      next[r.category_id] = (r.amount_cents / 100).toFixed(2);
    }
    setDrafts(next);
  }

  function apply() {
    if (!dialog) return;
    const rows = dialog.suggestions
      .map((s) => {
        const cents = parseAmountToCents(drafts[s.category_id] ?? "");
        return {
          category_id: s.category_id,
          amount_cents: cents == null || cents < 0 ? 0 : cents,
        };
      })
      .filter((r) => r.amount_cents > 0);
    startTransition(async () => {
      try {
        const n = await applyBudgetSuggestions({ month, rows });
        toast.success(`Applied ${n} budgets`);
        setDialog(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" disabled={pending} onClick={copyLast}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Copy from last month
      </Button>
      <Button variant="outline" disabled={pending} onClick={loadSuggest}>
        <Sparkles className="mr-1 h-4 w-4" />
        Suggest from last 3 months
      </Button>
      <Button variant="outline" disabled={pending} onClick={loadAutoBalance}>
        <Wand2 className="mr-1 h-4 w-4" />
        Auto-balance to income
      </Button>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.title}</DialogTitle>
            <DialogDescription>
              Review and tweak amounts before applying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(dialog?.suggestions ?? []).map((s) => {
              const c = catById.get(s.category_id);
              return (
                <div
                  key={s.category_id}
                  className="grid grid-cols-[1fr_140px] items-center gap-3"
                >
                  <Label className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c?.color ?? "#94a3b8" }}
                    />
                    <span className="truncate">{c?.name ?? "Category"}</span>
                  </Label>
                  <Input
                    className="font-tabular"
                    inputMode="decimal"
                    value={drafts[s.category_id] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [s.category_id]: e.target.value,
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={pending}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
