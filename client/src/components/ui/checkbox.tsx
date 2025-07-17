import * as React from "react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, checked = false, onCheckedChange, ...props }, ref) => (
  <button
    ref={ref}
    role="checkbox"
    aria-checked={checked}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-slate-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      checked && "bg-slate-900 text-slate-50",
      className
    )}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  >
    {checked && (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    )}
  </button>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }