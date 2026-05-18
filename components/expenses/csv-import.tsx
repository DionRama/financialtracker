"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { Upload, FileUp, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { importExpenses } from "@/lib/actions/expenses";
import type { ImportRow } from "@/lib/validation";

type Field = "date" | "amount" | "category" | "note" | "tags" | "__skip__";

interface CsvImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cur.push(field);
        field = "";
      } else if (ch === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function guessField(header: string): Field {
  const h = header.trim().toLowerCase();
  if (/date|when|occurred/.test(h)) return "date";
  if (/amount|price|cost|total|value/.test(h)) return "amount";
  if (/category|cat/.test(h)) return "category";
  if (/note|memo|description|desc/.test(h)) return "note";
  if (/tags?|labels?/.test(h)) return "tags";
  return "__skip__";
}

function parseAmountToCents(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[$€£¥\s]/g, "");
  const neg = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/^\(|\)$/g, "").replace(/^-/, "");
  // Handle "1,234.56" vs "1.234,56"
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const parts = s.split(",");
    if (parts[parts.length - 1].length === 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }
  const n = Number(s);
  if (!isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return neg ? cents : cents;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m1) {
    let [, a, b, y] = m1;
    const yr = y.length === 2 ? `20${y}` : y;
    // Assume MM/DD/YYYY
    const mm = a.padStart(2, "0");
    const dd = b.padStart(2, "0");
    if (Number(mm) <= 12 && Number(dd) <= 31) {
      return `${yr}-${mm}-${dd}`;
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);
}

type Step = "upload" | "map" | "preview";

export function CsvImport({ open, onOpenChange }: CsvImportProps) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, Field>>({});
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setDragging(false);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }
    const [head, ...rest] = parsed;
    const initialMap: Record<number, Field> = {};
    head.forEach((h, i) => {
      initialMap[i] = guessField(h);
    });
    setHeaders(head);
    setRows(rest);
    setMapping(initialMap);
    setStep("map");
  }, []);

  const colsByField = useMemo(() => {
    const m: Partial<Record<Field, number>> = {};
    for (const [idxStr, field] of Object.entries(mapping)) {
      if (field !== "__skip__" && m[field] === undefined) {
        m[field] = Number(idxStr);
      }
    }
    return m;
  }, [mapping]);

  const mappedRows = useMemo(() => {
    const dateCol = colsByField.date;
    const amountCol = colsByField.amount;
    if (dateCol === undefined || amountCol === undefined) return [];

    const out: { row: ImportRow; raw: string[]; ok: boolean; reason?: string }[] =
      [];
    for (const r of rows) {
      const date = parseDate(r[dateCol] ?? "");
      const amount_cents = parseAmountToCents(r[amountCol] ?? "");
      if (!date) {
        out.push({ row: {} as ImportRow, raw: r, ok: false, reason: "Invalid date" });
        continue;
      }
      if (!amount_cents) {
        out.push({
          row: {} as ImportRow,
          raw: r,
          ok: false,
          reason: "Invalid amount",
        });
        continue;
      }
      const row: ImportRow = {
        date,
        amount_cents,
        category_name:
          colsByField.category !== undefined
            ? (r[colsByField.category]?.trim() || null)
            : null,
        note:
          colsByField.note !== undefined
            ? (r[colsByField.note]?.trim() || null)
            : null,
        tags:
          colsByField.tags !== undefined ? parseTags(r[colsByField.tags] ?? "") : [],
      };
      out.push({ row, raw: r, ok: true });
    }
    return out;
  }, [rows, colsByField]);

  const validRows = useMemo(() => mappedRows.filter((m) => m.ok), [mappedRows]);
  const invalidCount = mappedRows.length - validRows.length;
  const canProceed =
    colsByField.date !== undefined && colsByField.amount !== undefined;

  function handleClose() {
    if (pending) return;
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  function commit() {
    if (validRows.length === 0) {
      toast.error("Nothing to import");
      return;
    }
    startTransition(async () => {
      try {
        const result = await importExpenses(validRows.map((v) => v.row));
        toast.success(
          `Imported ${result.inserted} expense${result.inserted === 1 ? "" : "s"}` +
            (result.skipped ? ` (${result.skipped} skipped)` : ""),
        );
        onOpenChange(false);
        setTimeout(reset, 200);
      } catch (err) {
        (console.error(err), toast.error("Import failed"));
      }
    });
  }

  function fieldSelect(colIdx: number) {
    const current = mapping[colIdx] ?? "__skip__";
    return (
      <Select
        value={current}
        onValueChange={(v) =>
          setMapping((m) => ({ ...m, [colIdx]: v as Field }))
        }
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__skip__">— Skip —</SelectItem>
          <SelectItem value="date">Date *</SelectItem>
          <SelectItem value="amount">Amount *</SelectItem>
          <SelectItem value="category">Category</SelectItem>
          <SelectItem value="note">Note</SelectItem>
          <SelectItem value="tags">Tags</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file with your expenses."}
            {step === "map" && "Map your CSV columns to expense fields."}
            {step === "preview" && "Review the first rows before importing."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-input bg-muted/30",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">Drag &amp; drop a CSV file here</p>
              <p className="text-muted-foreground">or click to choose</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4" /> Choose file
            </Button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-3">
            <div className="max-h-[40vh] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">CSV Column</th>
                    <th className="px-3 py-2">Sample</th>
                    <th className="px-3 py-2 w-44">Map to</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {headers.map((h, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">{h || `Column ${i + 1}`}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]">
                        {rows[0]?.[i] ?? ""}
                      </td>
                      <td className="px-3 py-2">{fieldSelect(i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              * Date and Amount are required.
            </p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="max-h-[40vh] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {validRows.slice(0, 5).map((v, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{v.row.date}</td>
                      <td className="px-3 py-2 font-tabular">
                        {(v.row.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">{v.row.category_name ?? "—"}</td>
                      <td className="px-3 py-2 truncate max-w-[200px]">
                        {v.row.note ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {v.row.tags?.length ? v.row.tags.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              {validRows.length} valid row{validRows.length === 1 ? "" : "s"} ready to import.
              {invalidCount > 0 ? ` ${invalidCount} will be skipped.` : ""}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="ghost" onClick={handleClose}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          )}
          {step === "map" && (
            <>
              <Button variant="ghost" onClick={reset}>
                Back
              </Button>
              <Button
                disabled={!canProceed}
                onClick={() => setStep("preview")}
              >
                Preview
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button
                disabled={pending || validRows.length === 0}
                onClick={commit}
              >
                {pending ? "Importing…" : `Import ${validRows.length}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
