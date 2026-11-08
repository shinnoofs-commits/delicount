"use client"

import * as React from "react"
import { addDays, format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subDays, startOfDay, endOfDay } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  disabled?: boolean
  inline?: boolean
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  disabled,
  inline = false
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const presets = [
    {
      label: "今日",
      getValue: () => {
        const today = new Date()
        return { from: startOfDay(today), to: endOfDay(today) }
      }
    },
    {
      label: "昨日",
      getValue: () => {
        const yesterday = subDays(new Date(), 1)
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      }
    },
    {
      label: "一昨日",
      getValue: () => {
        const twoDaysAgo = subDays(new Date(), 2)
        return { from: startOfDay(twoDaysAgo), to: endOfDay(twoDaysAgo) }
      }
    },
    {
      label: "今週",
      getValue: () => {
        const today = new Date()
        return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfDay(today) }
      }
    },
    {
      label: "先週",
      getValue: () => {
        const lastWeek = subDays(new Date(), 7)
        return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) }
      }
    },
    {
      label: "今月",
      getValue: () => {
        const today = new Date()
        return { from: startOfMonth(today), to: endOfDay(today) }
      }
    },
    {
      label: "先月",
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      }
    },
    {
      label: "過去30日間",
      getValue: () => {
        const today = new Date()
        return { from: subDays(today, 29), to: endOfDay(today) }
      }
    }
  ]

  if (inline) {
    return (
      <div className={cn("grid gap-2 border rounded-xl bg-background shadow-sm overflow-hidden", className)}>
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-1 p-3 border-b bg-muted/20">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="text-[10px] font-bold h-7 px-2"
                onClick={() => setDate(preset.getValue())}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2 flex justify-center">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(d) => setDate(d)}
              numberOfMonths={1}
              locale={ja}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            disabled={disabled}
            className={cn(
              "justify-start text-left font-bold h-9 bg-background min-w-[240px]",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy/MM/dd")} - {format(date.to, "yyyy/MM/dd")}
                </>
              ) : (
                format(date.from, "yyyy/MM/dd")
              )
            ) : (
              <span>期間を選択してください</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex flex-col md:flex-row bg-background z-50 shadow-xl" align="start">
          <div className="flex flex-col gap-1 p-3 border-b md:border-b-0 md:border-r">
            <span className="text-[10px] font-black uppercase text-muted-foreground mb-1 px-2">クイック選択</span>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-bold"
                onClick={() => {
                  setDate(preset.getValue());
                  setIsOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2 flex flex-col">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(d) => {
                setDate(d);
                if (d?.from && d?.to) {
                   setIsOpen(false);
                }
              }}
              numberOfMonths={2}
              locale={ja}
            />
            <div className="flex items-center justify-between p-2 mt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>クリア</Button>
              <Button size="sm" onClick={() => setIsOpen(false)}>選択完了</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
