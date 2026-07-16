import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      onClick={onToggle}
      type="button"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <motion.span
        key={theme}
        initial={{ opacity: 0, rotate: -20, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </motion.span>
    </motion.button>
  );
}
