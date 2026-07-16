import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ id, label, checked, onChange, className }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-muted", className)}>
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer h-4 w-4 appearance-none rounded border border-border bg-bg outline-none transition-colors checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <motion.span
          initial={false}
          animate={{ scale: checked ? 1 : 0.7, opacity: checked ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 450, damping: 26 }}
          className="pointer-events-none absolute text-white"
          aria-hidden="true"
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </motion.span>
      </span>
      {label}
    </label>
  );
}
