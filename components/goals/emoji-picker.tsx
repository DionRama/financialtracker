"use client";

import { useState } from "react";
import { Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESETS = [
  "🎯", "🏖", "🏠", "🚗", "✈️", "🎓",
  "💍", "💻", "📱", "🎁", "🛍", "🍽",
  "🏋️", "🐶", "👶", "💼", "🎮", "📚",
  "💊", "🛠", "🪴", "❤️", "🌍", "💰",
];

interface Props {
  value: string | null | undefined;
  onChange: (emoji: string | null) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  function pick(e: string | null) {
    onChange(e);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Pick goal emoji"
          className={cn("h-10 w-10 text-xl", className)}
        >
          {value || <Smile className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div className="grid grid-cols-6 gap-1">
          {PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => pick(e)}
              className={cn(
                "rounded text-xl transition hover:bg-accent",
                value === e && "bg-accent",
              )}
              aria-label={`Select ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom (1 emoji)"
            maxLength={4}
            className="h-9"
          />
          <Button
            type="button"
            size="sm"
            disabled={!custom.trim()}
            onClick={() => pick(custom.trim() || null)}
          >
            Use
          </Button>
        </div>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => pick(null)}
          >
            Remove emoji
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
