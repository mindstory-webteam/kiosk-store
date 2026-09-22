import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12221f",
        teal: {
          950: "#0b1f1c",
          900: "#12322c",
          800: "#194339",
          700: "#215647",
          600: "#2b6e58",
        },
        amber: {
          500: "#e0973f",
          600: "#c97f2b",
        },
        cloud: "#f3f1ea",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
