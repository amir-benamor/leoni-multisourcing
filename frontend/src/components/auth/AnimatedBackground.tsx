import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-20 -left-16 h-64 w-64 rounded-full bg-sky-400/25 blur-3xl"
        animate={{ x: [0, 28, -10, 0], y: [0, 14, 22, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl"
        animate={{ x: [0, -20, 16, 0], y: [0, -18, 10, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.09),transparent_45%)]"
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
