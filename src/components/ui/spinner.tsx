import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
}

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"].reverse()

export function Spinner({ className }: SpinnerProps) {
  return (
    <span 
      className={cn(
        "inline-block font-mono",
        className
      )}
    >
      {spinnerFrames.map((frame, i) => (
        <span
          key={i}
          className="absolute animate-spinner-frame"
          style={{
            animationDelay: `${i * -80}ms`,
            opacity: 0,
          }}
        >
          {frame}
        </span>
      ))}
      <span className="invisible">⠋</span>
    </span>
  )
} 