/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dusty: "#81A6C6",
        pale: "#AACDDC",
        cream: "#F3E3D0",
        sand: "#D2C4B4",
        ink: {
          DEFAULT: "#2a3338",
          muted: "#5a6570"
        }
      },
      fontFamily: {
        serif: ["Libre Baskerville", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};
