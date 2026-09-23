/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Same materials as the storefront, so the two halves of the product
           read as one system. */
        kaolin: "#E5E1D8",    // page ground
        porcelain: "#F6F4F0", // panels and inputs
        ink: "#171E1B",       // text, sidebar, primary buttons
        cobalt: "#22407A",    // primary action + focus
        celadon: "#A9BEB1",   // "active"/healthy marks
        rule: "#CFC8BB",      // hairlines and borders
        clay: "#8C4A3F",      // destructive actions — a fired-clay red
        cloud: "#F7F6F2",     // kept: referenced by existing styles
      },
      fontFamily: {
        display: ["Newsreader", "Georgia", "serif"],
        sans: ["Archivo", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        panel: "3px",
      },
    },
  },
  plugins: [],
};