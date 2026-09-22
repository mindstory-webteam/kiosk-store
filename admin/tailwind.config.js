/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
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
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
