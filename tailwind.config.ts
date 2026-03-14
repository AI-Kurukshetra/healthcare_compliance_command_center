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
        ink: "#102132",
        mist: "#edf4fb",
        alert: "#b33a3a",
        signal: "#d66b2d",
        ocean: "#2a678f",
        tide: "#5fa3c6",
        success: "#1d8f6a"
      },
      boxShadow: {
        panel: "0 24px 60px rgba(16, 33, 50, 0.12)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(16, 33, 50, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 33, 50, 0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
