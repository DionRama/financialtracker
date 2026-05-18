"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatCurrency } from "@/lib/format";
import { archiveIncomeSource, deleteIncomeEntry } from "@/lib/actions/income";

import {
  IncomeEntryDialog,
  type IncomeEntryValue,
  IncomeSourceDialog,
  type IncomeSourceValue,
} from "./income-dialogs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Source {
  id: string;
  name: string;
  kind: IncomeSourceValue["kind"];
  default_amount_cents: number;
  currency: string;
  is_active: boolean;
}

interface Entry {
  id: string;
  source_id: string | null;
  amount_cents: number;
  received_at: string;
  note: string | null;
}

interface Props {
  sources: Source[];
  entries: Entry[];
  currency: string;
  locale: string;
}

export function IncomeView({ sources, entries, currency, locale }: Props) {
  const [entryDialog, setEntryDialog] = useState(false);
  const [editEntry, setEditEntry] = useState<IncomeEntryValue | null>(null);
  const [sourceDialog, setSourceDialog] = useState(false);
  const [editSource, setEditSource] = useState<IncomeSourceValue | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const sourceById = useMemo(
    () => new Map(sources.map((s) => [s.id, s])),
    [sources],
  );

  function openNewEntry() {
    setEditEntry(null);
    setEntryDialog(true);
  }
  function openEditEntry(e: Entry) {
    setEditEntry({
      id: e.id,
      source_id: e.source_id,
      amount_cents: e.amount_cents,
      received_at: e.received_at,
      note: e.note,
    });
    setEntryDialog(true);
  }
  function removeEntry(id: string) {
    startTransition(async () => {
      try {
        await deleteIncomeEntry(id);
        toast.success("Entry deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function openNewSource() {
    setEditSource(null);
    setSourceDialog(true);
  }
  function openEditSource(s: Source) {
    setEditSource({
      id: s.id,
      name: s.name,
      kind: s.kind,
      default_amount_cents: s.default_amount_cents,
      currency: s.currency,
      is_active: s.is_active,
    });
    setSourceDialog(true);
  }
  function archive(id: string) {
    startTransition(async () => {
      try {
        await archiveIncomeSource(id);
        toast.success("Source archived");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Entries</CardTitle>
          <Button size="sm" onClick={openNewEntry}>
            <Plus className="mr-1 h-4 w-4" /> Add income
          </Button>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No income yet this month"
              description="Track every paycheck and side income to see your full picture."
              action={
                <div className="flex flex-col items-center gap-2">
                  <Button onClick={openNewEntry}>
                    <Plus className="mr-1 h-4 w-4" /> Log income
                  </Button>
                  <a
                    href="/settings"
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Set monthly default in Settings
                  </a>
                </div>
              }
            />
          ) : (
            <ul className="divide-y">
              {entries.map((e) => {
                const s = e.source_id ? sourceById.get(e.source_id) : null;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {e.note || s?.name || "Income"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s?.name ?? "No source"} ·{" "}
                        {new Date(e.received_at).toLocaleDateString(locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-tabular">
                      {formatCurrency(e.amount_cents, currency, locale)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => openEditEntry(e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      disabled={pending}
                      onClick={() => setDeletingEntryId(e.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Income sources</CardTitle>
          <Button size="sm" variant="outline" onClick={openNewSource}>
            <Plus className="mr-1 h-4 w-4" /> Add source
          </Button>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No sources yet"
              description="Add salary, freelance, or investment accounts to categorize income."
              action={
                <Button onClick={openNewSource}>
                  <Plus className="mr-1 h-4 w-4" /> Add source
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sources.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.kind} · default{" "}
                        {formatCurrency(
                          s.default_amount_cents,
                          s.currency,
                          locale,
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => openEditSource(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Archive"
                      disabled={pending}
                      onClick={() => archive(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <IncomeEntryDialog
        open={entryDialog}
        onOpenChange={setEntryDialog}
        sources={sources}
        currency={currency}
        locale={locale}
        initial={editEntry}
      />
      <IncomeSourceDialog
        open={sourceDialog}
        onOpenChange={setSourceDialog}
        currency={currency}
        locale={locale}
        initial={editSource}
      />
      <ConfirmDialog
        open={deletingEntryId !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingEntryId(null);
        }}
        title="Delete income entry?"
        description="This income transaction will be permanently removed."
        pending={pending}
        onConfirm={() => {
          if (deletingEntryId) {
            removeEntry(deletingEntryId);
            setDeletingEntryId(null);
          }
        }}
      />
    </div>
  );
}
