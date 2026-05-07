import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141311",
        night: "#201e1a",
        moss: "#76836d",
        clay: "#b98768",
        pearl: "#f2eee6",
        fog: "#d8d0c2"
      },
      boxShadow: {
        hush: "0 24px 80px rgba(20, 19, 17, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
