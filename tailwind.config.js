/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1a1a1a",
          muted: "#5a5a5a",
        },
        paper: "#fafaf7",
        accent: "#d63a3a",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Hiragino Sans",
          "Noto Sans JP",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
