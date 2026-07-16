import { motion } from "framer-motion";
import { AnimatedBackground } from "./AnimatedBackground";
import { MiniChart } from "./MiniChart";
import { COMPANY_NAME, HEADLINE, METRIC_CHIPS, PRODUCT_NAME, SUBTEXT } from "../../lib/constants";

interface BrandPanelProps {
  headline?: string;
  subtext?: string;
}

export function BrandPanel({ headline = HEADLINE, subtext = SUBTEXT }: BrandPanelProps) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-gradient px-6 py-10 text-white sm:px-10 lg:h-full lg:px-14 lg:py-14">
      <AnimatedBackground />
      <div className="relative z-10 flex h-full flex-col justify-between gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.25em] text-white/75">{PRODUCT_NAME}</p>
            <p className="text-sm font-medium text-white/85">{COMPANY_NAME}</p>
          </div>
          <div className="max-w-xl space-y-3">
            <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{headline}</h1>
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">{subtext}</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="glass-panel max-w-xl rounded-2xl p-4 sm:p-5"
        >
          <MiniChart />
          <div className="mt-4 flex flex-wrap gap-2">
            {METRIC_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/85"
              >
                <strong className="font-semibold text-white">{chip.value}</strong>
                {chip.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
