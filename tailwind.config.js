/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#f4f4f2",
        surface: "#ffffff",
        fill: "#fafaf8",
        navy: {
          DEFAULT: "#1f3a52",
          light: "#2c5f8f"
        },
        ink: {
          DEFAULT: "#14120f",
          body: "#1a1714",
          secondary: "#3a3631",
          muted: "#6b6660",
          faint: "#9b958c",
          placeholder: "#8a857c"
        },
        line: {
          DEFAULT: "#e4e1da",
          soft: "#ecece6",
          hair: "#d9d6cf"
        },
        num: "#c4bfb6",
        record: "#d24a3d"
      },
      fontFamily: {
        sans: ["Open Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        card: "0 1px 1px rgba(20,18,15,0.04), 0 2px 4px -1px rgba(20,18,15,0.07)"
      },
      maxWidth: {
        shell: "1180px"
      }
    }
  },
  plugins: []
};
