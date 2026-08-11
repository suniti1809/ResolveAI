/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Outfit", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace"],
      },
      colors: {
        // Electric-blue primary (was cyan)
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // Violet accent
        accent: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        // Strict dark-mode surface tokens
        surface: {
          DEFAULT: "#0f172a",   // deepest bg
          50:  "#111827",       // page bg alternative
          100: "#0f172a",       // page bg / input bg
          200: "#1e293b",       // card / panel surface
          300: "#334155",       // borders
          400: "#475569",       // muted borders
          500: "#64748b",       // placeholder text
        },
        // Status-specific semantic tokens
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          900: "#451a03",
        },
        emerald: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "blob":       "blob 8s infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" },  "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        blob: {
          "0%":   { transform: "translate(0px, 0px) scale(1)" },
          "33%":  { transform: "translate(30px, -50px) scale(1.1)" },
          "66%":  { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
      },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [],
};
