import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { CategoriesList, type CategoryRow } from "@/components/categories/categories-list";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, color, is_archived")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories: CategoryRow[] = data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Categories"
        description="Organize your expenses with custom categories."
      />
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not load categories.
        </div>
      ) : (
        <CategoriesList categories={categories} />
      )}
    </div>
  );
}
