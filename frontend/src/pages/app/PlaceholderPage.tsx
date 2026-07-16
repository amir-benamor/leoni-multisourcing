import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-6xl"
    >
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-premium sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Coming next
        </div>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          This module is intentionally a placeholder to validate routing and shell composition. Detailed business content
          will be implemented in the next iteration.
        </p>
      </div>
    </motion.section>
  );
}
