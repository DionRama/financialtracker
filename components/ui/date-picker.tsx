"use client";

import * as React from "react";
import { DayPicker, type Locale } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "react-day-picker/style.css";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value: string | undefined;
  onChange: (iso: string) => void;
  locale?: Locale;
  disabled?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
}

function parseIso(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

type NavButtonProps = React.ComponentProps<"button">;

function PrevMonthButton(props: NavButtonProps) {
  const { className, children: _children, ...rest } = props;
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("h-7 w-7", className)}
      {...rest}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
  );
}

function NextMonthButton(props: NavButtonProps) {
  const { className, children: _children, ...rest } = props;
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("h-7 w-7", className)}
      {...rest}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}

export function DatePicker({
  value,
  onChange,
  locale,
  disabled,
  id,
  className,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseIso(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span>{selected ? format(selected, "PPP") : placeholder}</span>
          <CalendarIcon className="ml-auto h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          locale={locale}
          showOutsideDays
          className="p-3"
          components={{
            PreviousMonthButton: PrevMonthButton,
            NextMonthButton: NextMonthButton,
          }}
          classNames={{
            months: "flex flex-col sm:flex-row gap-4",
            month: "space-y-4",
            month_caption:
              "flex items-center justify-between gap-2 px-1 pt-1",
            caption_label: "text-sm font-medium",
            nav: "flex items-center gap-1",
            month_grid: "w-full border-collapse space-y-1",
            weekdays: "flex",
            weekday:
              "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            week: "flex w-full mt-2",
            day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 h-9 w-9",
            day_button: cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            ),
            selected:
              "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground",
            today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
            outside: "text-muted-foreground opacity-50",
            disabled: "text-muted-foreground opacity-50",
            hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
