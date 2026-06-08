import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "var(--brand-accent, #FF5200)",
          orangeSoft: "var(--brand-accent-soft, #F97D40)",
          charcoal: "var(--brand-charcoal, #1D1B1A)",
          ink: "var(--brand-ink, #3A3735)",
          stone: "var(--brand-stone, #D7CABF)",
          fog: "var(--brand-fog, #F3F3F3)"
        }
      },
      boxShadow: {
        studio: "0 18px 45px rgba(29, 27, 26, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
