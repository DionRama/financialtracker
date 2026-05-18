"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MoneyInputProps {
  value: number;
  onChange: (cents: number) => void;
  currency: string;
  locale: string;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

function getCurrencySymbol(locale: string, currency: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? "";
  } catch {
    return "";
  }
}

function digitsToCents(digits: string): number {
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * MoneyInput stores integer cents and displays a formatted currency string
 * while the user types. Strategy: strip non-digits on every keystroke, treat
 * the resulting digits as integer cents (last 2 digits = fractional cents),
 * then reformat via `formatCurrency`.
 *
 * Caret position: after each change we reset the selection to the end of the
 * input. This is acceptable for an amount-entry UX where users type
 * left-to-right, but it means caret edits in the middle of the value are not
 * supported.
 */
export function MoneyInput({
  value,
  onChange,
  currency,
  locale,
  placeholder,
  id,
  autoFocus,
  disabled,
  className,
}: MoneyInputProps) {
  const symbol = React.useMemo(
    () => getCurrencySymbol(locale, currency),
    [locale, currency],
  );

  const formatFromCents = React.useCallback(
    (cents: number): string => {
      if (!cents) return "";
      try {
        const formatted = formatCurrency(cents, currency, locale);
        // Remove the currency symbol since we render it as a prefix.
        return symbol ? formatted.replace(symbol, "").trim() : formatted;
      } catch {
        return (cents / 100).toFixed(2);
      }
    },
    [currency, locale, symbol],
  );

  const [display, setDisplay] = React.useState<string>(() =>
    formatFromCents(value),
  );

  const lastEmittedRef = React.useRef<number>(value);

  React.useEffect(() => {
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      setDisplay(formatFromCents(value));
    }
  }, [value, formatFromCents]);

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "");
    const cents = digitsToCents(digits);
    const next = formatFromCents(cents);
    setDisplay(next);
    lastEmittedRef.current = cents;
    onChange(cents);
    // Reset caret to end of input after React re-renders.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        const end = el.value.length;
        try {
          el.setSelectionRange(end, end);
        } catch {
          // Some input types disallow setSelectionRange; safe to ignore.
        }
      }
    });
  };

  const handleBlur = () => {
    const digits = display.replace(/\D/g, "");
    const cents = digitsToCents(digits);
    setDisplay(formatFromCents(cents));
    lastEmittedRef.current = cents;
    onChange(cents);
  };

  return (
    <div className={cn("relative", className)}>
      {symbol ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground"
        >
          {symbol}
        </span>
      ) : null}
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(symbol ? "pl-7" : undefined)}
      />
    </div>
  );
}
