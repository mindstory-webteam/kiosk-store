/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* --- the shop palette -------------------------------------- */
        // Ground colour. The products are white objects photographed on white,
        // so the page must not be white or they dissolve into it.
        kaolin: "#E5E1D8",
        // The tiles products sit in — a shade lighter than the ground.
        porcelain: "#F6F4F0",
        // Text. A near-black with green in it, to sit with the glaze tones.
        ink: "#171E1B",
        // Accent: cobalt oxide, the pigment behind blue-and-white porcelain.
        cobalt: "#22407A",
        // Pale glaze green, for quiet marks like the in-stock dot.
        celadon: "#A9BEB1",
        // Hairlines.
        rule: "#CFC8BB",

        /* --- kept for the pages not yet redesigned ------------------ */
        // Navbar, login and the admin panel still reference this.
        cloud: "#F7F6F2",
      },
      fontFamily: {
        // Names, prices, headlines — anything the eye should linger on.
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        // Interface: labels, buttons, body copy, form controls.
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      maxWidth: {
        // The shop grid is wider than a reading column.
        shop: "88rem",
      },
      zIndex: {
        lightbox: "999",
      },
    },
  },
  plugins: [],
};