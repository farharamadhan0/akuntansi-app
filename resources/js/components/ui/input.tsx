import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function formatIsoDate(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return value
  }

  return `${match[3]}/${match[2]}/${match[1]}`
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function parseDisplayDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (!match) {
    return null
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return `${match[3]}-${match[2]}-${match[1]}`
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function DateInput({
  className,
  value,
  defaultValue,
  onChange,
  onBlur,
  placeholder,
  disabled,
  readOnly,
  min,
  max,
  step,
  ...props
}: React.ComponentProps<"input">) {
  const pickerRef = React.useRef<HTMLInputElement>(null)
  const [displayValue, setDisplayValue] = React.useState(() =>
    formatIsoDate(value ?? defaultValue)
  )
  const [committedValue, setCommittedValue] = React.useState(() =>
    typeof (value ?? defaultValue) === "string" ? String(value ?? defaultValue) : ""
  )
  const isControlled = value !== undefined

  React.useEffect(() => {
    if (isControlled) {
      setDisplayValue(formatIsoDate(value))
      setCommittedValue(typeof value === "string" ? value : "")
    }
  }, [isControlled, value])

  const emitChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    nextValue: string
  ) => {
    setCommittedValue(nextValue)
    onChange?.({
      ...event,
      target: { ...event.target, value: nextValue },
      currentTarget: { ...event.currentTarget, value: nextValue },
    } as React.ChangeEvent<HTMLInputElement>)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(event.target.value)
    const parsed = parseDisplayDate(formatted)

    setDisplayValue(formatted)

    if (formatted === "") {
      emitChange(event, "")
      return
    }

    if (parsed) {
      emitChange(event, parsed)
    }
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseDisplayDate(displayValue)
    const nextValue = parsed ?? (isControlled && typeof value === "string" ? value : committedValue)

    setDisplayValue(formatIsoDate(nextValue))
    onBlur?.(event)
  }

  const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value

    setDisplayValue(formatIsoDate(nextValue))
    emitChange(event, nextValue)
  }

  const openPicker = () => {
    const picker = pickerRef.current

    if (!picker || disabled || readOnly) {
      return
    }

    if (typeof picker.showPicker === "function") {
      picker.showPicker()
      return
    }

    picker.focus()
    picker.click()
  }

  const pickerValue = isIsoDate(committedValue) ? committedValue : ""

  return (
    <div className="relative">
      <InputPrimitive
        type="text"
        inputMode="numeric"
        data-slot="input"
        value={displayValue}
        placeholder={placeholder ?? "dd/mm/yyyy"}
        maxLength={10}
        className={cn(
          "h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 pr-9 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        disabled={disabled}
        readOnly={readOnly}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={pickerValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        readOnly={readOnly}
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
        onChange={handlePickerChange}
      />
      <button
        type="button"
        aria-label="Pilih tanggal"
        className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled || readOnly}
        onClick={openPicker}
      >
        <CalendarIcon size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  if (type === "date") {
    return <DateInput className={className} {...props} />
  }

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
