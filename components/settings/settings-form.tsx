"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAllUserData, updateProfile } from "@/lib/actions/profile";
import { signOut } from "@/lib/actions/auth";

interface Props {
  email: string;
  initial: {
    full_name: string | null;
    currency: string;
    locale: string;
    monthly_income_cents: number | null;
    period_start_day: number;
  };
  sources: { id: string; name: string }[];
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "MXN", "BRL", "SGD"];
const LOCALES = ["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "it-IT", "ja-JP", "zh-CN", "pt-BR"];

export function SettingsForm({ email, initial, sources }: Props) {
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [currency, setCurrency] = useState(initial.currency);
  const [locale, setLocale] = useState(initial.locale);
  const [incomeCents, setIncomeCents] = useState<number>(
    initial.monthly_income_cents ?? 0,
  );
  const [periodStartDay, setPeriodStartDay] = useState<number>(
    initial.period_start_day ?? 1,
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await updateProfile({
          full_name: fullName.trim() || null,
          currency,
          locale,
          period_start_day: periodStartDay,
        });
        toast.success("Profile saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function saveIncome() {
    startTransition(async () => {
      try {
        await updateProfile({
          full_name: fullName.trim() || null,
          currency,
          locale,
          period_start_day: periodStartDay,
          monthly_income_cents: incomeCents > 0 ? incomeCents : null,
        });
        toast.success("Monthly income saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How the app addresses and formats things.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="period_start_day">Pay-cycle start day</Label>
            <Input
              id="period_start_day"
              type="number"
              min={1}
              max={28}
              value={periodStartDay}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) {
                  setPeriodStartDay(Math.max(1, Math.min(28, Math.trunc(n))));
                }
              }}
              className="font-tabular max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              What day of the month does your pay/budget cycle begin? Pick{" "}
              <strong>1</strong> for calendar months, or e.g. <strong>26</strong>{" "}
              if you&apos;re paid on the 26th. Income and expenses are then
              tracked in periods that run from this day to the day before it
              next month — historical data is re-bucketed automatically.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly income (default)</CardTitle>
          <CardDescription>
            Used as a fallback on the dashboard when no income entries exist
            for the month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Amount</Label>
            <MoneyInput
              value={incomeCents}
              onChange={setIncomeCents}
              currency={currency}
              locale={locale}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveIncome} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save income
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income sources</CardTitle>
          <CardDescription>
            Tag each paycheck or freelance gig.{" "}
            <Link href="/income" className="underline">
              Manage on /income
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {sources.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete all your expenses, budgets and categories. Your
            account remains.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAllDialog />
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteAllDialog() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        await deleteAllUserData();
        toast.success("All data deleted");
        setOpen(false);
        setConfirm("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete all data</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete all data?</DialogTitle>
          <DialogDescription>
            This cannot be undone. Type <strong>DELETE</strong> below to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={run}
            disabled={pending || confirm !== "DELETE"}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
