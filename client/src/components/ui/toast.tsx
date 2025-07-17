import * as React from "react"
import { cn } from "@/lib/utils"

// Simple toast store 
let toastCount = 0
let toastListeners: Array<() => void> = []
let toasts: Array<{
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}> = []

function addToast(toast: {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}) {
  const id = `toast-${++toastCount}`
  toasts = [...toasts, { ...toast, id }]
  toastListeners.forEach(listener => listener())
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    toastListeners.forEach(listener => listener())
  }, 5000)
}

export function useToast() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)
  
  React.useEffect(() => {
    toastListeners.push(forceUpdate)
    return () => {
      toastListeners = toastListeners.filter(listener => listener !== forceUpdate)
    }
  }, [])
  
  const toast = React.useCallback((props: {
    title?: string
    description?: string
    variant?: "default" | "destructive"
  }) => {
    addToast(props)
  }, [])
  
  return { toast, toasts }
}

const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "destructive"
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        variant === "default" && "border-slate-200 bg-white text-slate-950",
        variant === "destructive" && "border-red-500/50 bg-red-500 text-slate-50",
        className
      )}
      {...props}
    />
  )
})
Toast.displayName = "Toast"

const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = "ToastDescription"

export {
  Toast,
  ToastTitle,
  ToastDescription,
}