/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Unbounded", "sans-serif"],
        sans: ["Manrope", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        bg: "#050505",
        surface: "#0A0A0C",
        "surface-2": "#121216",
        line: "#1E1E24",
        cyan: { DEFAULT: "#00F0FF", hi: "#4DFFFF" },
        volt: "#CCFF00",
        ink: { 1: "#FFFFFF", 2: "#A1A1AA", 3: "#52525B" },
        ok: "#00FF66",
        warn: "#FFB800",
        err: "#FF2A2A",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
