import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../../lib/cn";

type ToastType = "success" | "error" | "info";

interface ToastInlineProps {
  type: ToastType;
  message: string;
}

const toastConfig: Record<ToastType, { icon: JSX.Element; className: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
    className: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
  },
  info: {
    icon: <Info className="h-4 w-4" aria-hidden="true" />,
    className: "border-primary/25 bg-primary/10 text-primary"
  }
};

export function ToastInline({ type, message }: ToastInlineProps) {
  const config = toastConfig[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", config.className)}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <span>{message}</span>
    </motion.div>
  );
}
