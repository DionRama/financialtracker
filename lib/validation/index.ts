import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1).max(60),
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
  note: z.string().max(280).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
});
export type ExpenseInput = z.input<typeof expenseSchema>;
export type ExpenseParsed = z.output<typeof expenseSchema>;

export const importRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_cents: z.number().int().positive().max(1_000_000_000),
  category_name: z.string().min(1).max(60).nullable().optional(),
  note: z.string().max(280).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type ImportRow = z.input<typeof importRowSchema>;
export const importRowsSchema = z.array(importRowSchema).max(1000);

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
  monthly_income_cents: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(1_000_000_000_000)
    .nullable()
    .optional(),
});
export type ProfileInput = z.input<typeof profileSchema>;

// ----------------------------------------------------------------------------
// Income
// ----------------------------------------------------------------------------
export const incomeSourceSchema = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["salary", "freelance", "investment", "other"]),
  default_amount_cents: z.coerce.number().int().nonnegative().max(1_000_000_000_000),
  currency: z.string().length(3).toUpperCase().default("USD"),
  is_active: z.boolean().default(true),
});
export type IncomeSourceInput = z.input<typeof incomeSourceSchema>;

export const incomeEntrySchema = z.object({
  source_id: z.string().uuid().nullable().optional(),
  amount_cents: z.coerce.number().int().positive().max(1_000_000_000_000),
  received_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(280).nullable().optional(),
});
export type IncomeEntryInput = z.input<typeof incomeEntrySchema>;

// ----------------------------------------------------------------------------
// Savings goals
// ----------------------------------------------------------------------------
export const savingsGoalSchema = z.object({
  name: z.string().min(1).max(60),
  target_cents: z.coerce.number().int().positive().max(1_000_000_000_000),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#16a34a"),
  is_archived: z.boolean().default(false),
});
export type SavingsGoalInput = z.input<typeof savingsGoalSchema>;

export const goalContributionSchema = z.object({
  goal_id: z.string().uuid(),
  amount_cents: z.coerce.number().int().positive().max(1_000_000_000_000),
});
export type GoalContributionInput = z.input<typeof goalContributionSchema>;

// ----------------------------------------------------------------------------
// Recurring
// ----------------------------------------------------------------------------
export const recurringRuleSchema = z
  .object({
    kind: z.enum(["expense", "income"]),
    category_id: z.string().uuid().nullable().optional(),
    source_id: z.string().uuid().nullable().optional(),
    amount_cents: z.coerce.number().int().positive().max(1_000_000_000_000),
    currency: z.string().length(3).toUpperCase().default("USD"),
    description: z.string().max(120).nullable().optional(),
    cadence: z.enum(["weekly", "biweekly", "monthly", "yearly"]),
    interval_count: z.coerce.number().int().min(1).max(24).default(1),
    day_of_month: z.coerce.number().int().min(1).max(31).nullable().optional(),
    weekday: z.coerce.number().int().min(0).max(6).nullable().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    next_run_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    is_paused: z.boolean().default(false),
    is_subscription: z.boolean().default(false),
    vendor: z.string().max(80).nullable().optional(),
  })
  .refine(
    (v) =>
      v.end_date == null ||
      v.end_date >= v.start_date,
    { message: "End date must be on or after start date", path: ["end_date"] },
  );
export type RecurringRuleInput = z.input<typeof recurringRuleSchema>;

export const authPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const authMagicLinkSchema = z.object({
  email: z.string().email(),
});
