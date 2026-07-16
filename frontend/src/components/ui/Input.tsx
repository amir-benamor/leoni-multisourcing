import { motion } from "framer-motion";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  rightAdornment?: ReactNode;
}

export function Input({
  id,
  label,
  error,
  hint,
  rightAdornment,
  className,
  ...props
}: InputProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      animate={error ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.24 }}
      className="space-y-2"
    >
      <label htmlFor={id} className="block text-sm font-medium text-text">
        {label}
      </label>
      <div
        className={cn(
          "group relative flex items-center rounded-xl border bg-bg/80 transition-colors",
          error ? "border-red-500/80" : "border-border hover:border-primary/45",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/35"
        )}
      >
        <input
          id={id}
          className={cn(
            "h-11 w-full rounded-xl bg-transparent px-3 text-sm text-text outline-none",
            "placeholder:text-muted",
            rightAdornment ? "pr-11" : "",
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          {...props}
        />
        {rightAdornment ? (
          <div className="absolute right-2 flex h-8 w-8 items-center justify-center">{rightAdornment}</div>
        ) : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </motion.div>
  );
}
