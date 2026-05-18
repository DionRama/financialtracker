"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categorySchema, type CategoryInput } from "@/lib/validation";
import { createCategory, updateCategory } from "@/lib/actions/categories";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { id: string; name: string; color: string } | null;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  initial,
}: CategoryFormDialogProps) {
  const isEdit = Boolean(initial?.id);
  const [pending, startTransition] = useTransition();

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: initial?.name ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ name: initial?.name ?? "" });
  }, [open, initial, form]);

  function onSubmit(values: CategoryInput) {
    startTransition(async () => {
      try {
        if (isEdit && initial) {
          await updateCategory({ id: initial.id, name: values.name });
          toast.success("Category updated");
        } else {
          await createCategory({ name: values.name });
          toast.success("Category created");
        }
        onOpenChange(false);
        form.reset({ name: "" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Rename this category. Its color stays the same."
              : "Just give it a name — a unique color is picked automatically."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Groceries"
              autoFocus
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
