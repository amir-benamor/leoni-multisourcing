import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)"
      },
      boxShadow: {
        premium: "0 1px 1px rgba(14,24,39,0.06), 0 8px 24px rgba(14,24,39,0.08), 0 28px 60px rgba(14,24,39,0.12)",
        panel: "0 2px 6px rgba(8,15,26,0.08), 0 24px 48px rgba(8,15,26,0.2)"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(160deg, #091a37 0%, #0c2f63 50%, #0e4a93 100%)"
      }
    }
  },
  plugins: []
} satisfies Config;
