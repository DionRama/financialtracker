import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1).max(40),
});
export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryParsed = z.output<typeof categorySchema>;

export const expenseSchema = z.object({
  amount_cents: z.coerce
    .number()
    .int()
    .positive()
    .max(1_000_000_000),
  category_id: z.string().uuid().nullable().optional(),
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
});
export type ExpenseInput = z.input<typeof expenseSchema>;
export type ExpenseParsed = z.output<typeof expenseSchema>;

export const budgetSchema = z.object({
  category_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
  amount_cents: z.coerce.number().int().nonnegative().max(1_000_000_000),
});
export type BudgetInput = z.input<typeof budgetSchema>;

export const profileSchema = z.object({
  full_name: z.string().max(120).nullable().optional(),
  currency: z.string().length(3).toUpperCase().default("USD"),
  locale: z.string().min(2).max(20).default("en-US"),
});
export type ProfileInput = z.input<typeof profileSchema>;

export const authPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const authMagicLinkSchema = z.object({
  email: z.string().email(),
});
