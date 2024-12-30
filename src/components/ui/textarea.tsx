import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1",
          "focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[2.5rem] max-h-[12rem] resize-none overflow-y-auto",
          "caret-primary",
          className
        )}
        ref={ref}
        rows={1}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          const newHeight = Math.min(target.scrollHeight, 192); // 12rem = 192px
          target.style.height = `${newHeight}px`;
        }}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea } 