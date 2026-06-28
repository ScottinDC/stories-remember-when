/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        linen: {
          50: "#FFFCF7",
          100: "#F4EFE4",
          200: "#E8DFD0",
          300: "#D8CBB8"
        },
        ink: {
          DEFAULT: "#2A2118",
          muted: "#6B5E4F",
          faint: "#958879"
        },
        umber: {
          DEFAULT: "#9C6644",
          dark: "#7A4F33",
          soft: "#EEE4D7"
        }
      },
      fontFamily: {
        sans: ["Source Sans 3", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Libre Baskerville", "Georgia", "serif"]
      },
      boxShadow: {
        panel: "0 1px 2px rgba(42, 33, 24, 0.05), 0 8px 24px rgba(42, 33, 24, 0.06)"
      }
    }
  },
  plugins: []
};
