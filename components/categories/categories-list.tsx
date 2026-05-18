"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  deleteCategory,
  setCategoryArchived,
} from "@/lib/actions/categories";

import { CategoryFormDialog } from "./category-form-dialog";

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  is_archived: boolean;
}

interface CategoriesListProps {
  categories: CategoryRow[];
}

export function CategoriesList({ categories }: CategoriesListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [pending, startTransition] = useTransition();

  if (categories.length === 0) {
    return (
      <>
        <EmptyState
          icon={Plus}
          title="No categories yet"
          description="Create your first category to start tracking expenses."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New category
            </Button>
          }
        />
        <CategoryFormDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditing(null);
          }}
          initial={editing}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="h-10 w-10 shrink-0 rounded-lg"
                  style={{ backgroundColor: c.color }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.is_archived ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit"
                  onClick={() => {
                    setEditing(c);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={c.is_archived ? "Restore" : "Archive"}
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await setCategoryArchived(c.id, !c.is_archived);
                        toast.success(
                          c.is_archived ? "Restored" : "Archived",
                        );
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Failed",
                        );
                      }
                    });
                  }}
                >
                  {c.is_archived ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete "${c.name}"? Expenses keep their amounts but lose this category.`,
                      )
                    )
                      return;
                    startTransition(async () => {
                      try {
                        await deleteCategory(c.id);
                        toast.success("Category deleted");
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Failed",
                        );
                      }
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
      />
    </>
  );
}
