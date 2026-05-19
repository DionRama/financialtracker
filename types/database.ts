/**
 * Hand-typed Database type. Regenerate with:
 *   npx supabase gen types typescript --linked > types/database.ts
 *
 * This stub mirrors `supabase/migrations/0001_init.sql`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          currency: string;
          locale: string;
          monthly_income_cents: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          currency?: string;
          locale?: string;
          monthly_income_cents?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          is_archived: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          icon?: string;
          is_archived?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          amount_cents: number;
          occurred_at: string;
          note: string | null;
          tags: string[];
          recurring_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          amount_cents: number;
          occurred_at: string;
          note?: string | null;
          tags?: string[];
          recurring_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      income_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: "salary" | "freelance" | "investment" | "other";
          default_amount_cents: number;
          currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          kind?: "salary" | "freelance" | "investment" | "other";
          default_amount_cents?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["income_sources"]["Insert"]>;
        Relationships: [];
      };
      income_entries: {
        Row: {
          id: string;
          user_id: string;
          source_id: string | null;
          amount_cents: number;
          received_at: string;
          applies_to_month: string;
          note: string | null;
          recurring_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id?: string | null;
          amount_cents: number;
          received_at?: string;
          applies_to_month?: string;
          note?: string | null;
          recurring_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["income_entries"]["Insert"]>;
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_cents: number;
          saved_cents: number;
          deadline: string | null;
          color: string;
          emoji: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_cents: number;
          saved_cents?: number;
          deadline?: string | null;
          color?: string;
          emoji?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["savings_goals"]["Insert"]>;
        Relationships: [];
      };
      goal_contributions: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          amount_cents: number;
          note: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id: string;
          amount_cents: number;
          note?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goal_contributions"]["Insert"]>;
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          kind: "expense" | "income";
          category_id: string | null;
          source_id: string | null;
          amount_cents: number;
          currency: string;
          description: string | null;
          cadence: "weekly" | "biweekly" | "monthly" | "yearly";
          interval_count: number;
          day_of_month: number | null;
          weekday: number | null;
          start_date: string;
          end_date: string | null;
          next_run_date: string;
          is_paused: boolean;
          is_subscription: boolean;
          vendor: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: "expense" | "income";
          category_id?: string | null;
          source_id?: string | null;
          amount_cents: number;
          currency?: string;
          description?: string | null;
          cadence: "weekly" | "biweekly" | "monthly" | "yearly";
          interval_count?: number;
          day_of_month?: number | null;
          weekday?: number | null;
          start_date: string;
          end_date?: string | null;
          next_run_date: string;
          is_paused?: boolean;
          is_subscription?: boolean;
          vendor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recurring_rules"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          payload: Json;
          severity: "info" | "warning" | "critical";
          is_read: boolean;
          created_at: string;
          dedupe_key: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          payload?: Json;
          severity?: "info" | "warning" | "critical";
          is_read?: boolean;
          created_at?: string;
          dedupe_key: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          month: string;
          amount_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          month: string;
          amount_cents: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      monthly_totals: {
        Row: {
          user_id: string;
          month: string;
          category_id: string | null;
          total_cents: number;
          transactions: number;
        };
        Relationships: [];
      };
      monthly_income_totals: {
        Row: {
          user_id: string;
          month: string;
          total_cents: number;
          entries: number;
        };
        Relationships: [];
      };
      upcoming_recurring_30d: {
        Row: Database["public"]["Tables"]["recurring_rules"]["Row"];
        Relationships: [];
      };
    };
    Functions: {
      create_category_with_color: {
        Args: { p_name: string };
        Returns: Database["public"]["Tables"]["categories"]["Row"];
      };
      delete_all_user_data: {
        Args: Record<string, never>;
        Returns: void;
      };
      materialize_recurring: {
        Args: { p_through?: string };
        Returns: number;
      };
      contribute_to_goal: {
        Args: { p_goal_id: string; p_amount_cents: number; p_note?: string | null };
        Returns: number;
      };
      move_between_goals: {
        Args: {
          p_from: string;
          p_to: string;
          p_amount_cents: number;
          p_note?: string | null;
        };
        Returns: void;
      };
      delete_contribution: {
        Args: { p_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
