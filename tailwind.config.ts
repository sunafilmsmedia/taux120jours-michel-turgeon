import type { Config } from "tailwindcss";

// Palette reprise du branding déjà en production de Michel Turgeon
// (refinancement-michel-turgeon.vercel.app — logo-mt.png + CONFIG embarqué).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0A1F44", // bleu marine du monogramme MT
        "primary-deep": "#051230",
        "primary-light": "#14306A",
        accent: "#C3C9D2", // argent du logo
        ink: "#0F1A2E",
        muted: "#5F6878",
        line: "#E2E5EA",
        tint: "#EEF1F6",
        card: "#FFFFFF",
        danger: "#D2483C",
        positive: "#1F8A5C",
      },
      fontFamily: {
        sans: ["Montserrat", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        caps: ["Cinzel", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 18px 50px -12px rgba(3,12,32,0.35)",
        glow: "0 0 0 1px rgba(10,31,68,0.12), 0 10px 30px -8px rgba(10,31,68,0.25)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.4s ease both",
        pulseSoft: "pulseSoft 1.4s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
