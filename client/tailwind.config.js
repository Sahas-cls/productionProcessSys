/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        dancing: ['"Dancing Script"', "cursive"],
        winky: ['"Winky Rough"', "cursive"],
        badscript: ['"Bad Script"', "cursive"],
      },
      colors: {
        primary: "#FFFFFF",
        secondary: "#1a2238",
        accent: "#F3F4F6",
      },
    },
  },
  plugins: [],
};
