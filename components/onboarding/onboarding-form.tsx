"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { completeOnboarding } from "@/lib/actions/onboarding";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "MXN", "BRL", "SGD"];
const LOCALES = ["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "it-IT", "ja-JP", "zh-CN", "pt-BR"];

interface Props {
  initial: { currency: string; locale: string };
}

export function OnboardingForm({ initial }: Props) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initial.currency);
  const [locale, setLocale] = useState(initial.locale);
  const [incomeCents, setIncomeCents] = useState(0);
  const [suggest, setSuggest] = useState(true);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        await completeOnboarding({
          currency,
          locale,
          monthly_income_cents: incomeCents,
          suggest_budgets: suggest,
        });
        toast.success("All set — welcome!");
        router.push("/dashboard");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Currency &amp; locale</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Currency</Label>
            <select
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
            <Label>Locale</Label>
            <select
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Monthly income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Take-home (approximate)</Label>
            <MoneyInput
              value={incomeCents}
              onChange={setIncomeCents}
              currency={currency}
              locale={locale}
            />
            <p className="text-xs text-muted-foreground">
              Used to power Money-left, Savings-rate, and budget suggestions.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={suggest}
              onChange={(e) => setSuggest(e.target.checked)}
            />
            Suggest budgets from defaults (evenly split income across your
            categories — you can tweak later).
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          Finish setup
        </Button>
      </div>
    </div>
  );
}
