import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171B21",
        paper: "#F6F7F5",
        panel: "#FFFFFF",
        line: "#E3E6E1",
        teal: { DEFAULT: "#0E8F86", deep: "#0A6B64" },
        vinyl: "#FF5A1F",
        muted: "#69707A",
      },
      fontFamily: {
        display: ["'Archivo'", "'Inter'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,27,33,.05), 0 8px 24px rgba(23,27,33,.06)",
      },
    },
  },
  plugins: [],
};
export default config;
