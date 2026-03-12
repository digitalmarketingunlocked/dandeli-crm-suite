import * as React from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateInputProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  maxDate?: Date;
}

export function DateInput({ value, onChange, placeholder = "Pick a date", className, required, disabled, maxDate }: DateInputProps) {
  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  const handleSelect = (selected: Date | undefined) => {
    onChange(selected ? format(selected, "yyyy-MM-dd") : "");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={maxDate ? (d) => d > maxDate : undefined}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
