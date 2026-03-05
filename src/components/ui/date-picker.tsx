import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate } from "@/lib/formatter"

export interface DatePickerProps {
    date?: Date | string
    setDate: (date: Date | undefined) => void
    disabled?: boolean
    className?: string
    placeholder?: string
}

export function DatePicker({ date, setDate, disabled, className, placeholder = "Pick a date" }: DatePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
        date ? new Date(date) : undefined
    )

    // Update internal state when prop changes
    React.useEffect(() => {
        if (date) {
            const d = new Date(date)
            if (!isNaN(d.getTime())) {
                setSelectedDate(d)
            } else {
                setSelectedDate(undefined)
            }
        } else {
            setSelectedDate(undefined)
        }
    }, [date])

    const handleSelect = (d: Date | undefined) => {
        setSelectedDate(d)
        setDate(d)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? formatDate(date) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
