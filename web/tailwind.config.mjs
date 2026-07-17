import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#F4F4F5",
            foreground: "#11181C",
            primary: {
              50: "#E8F8F0",
              100: "#C5EDD9",
              200: "#91DBB6",
              300: "#5CC892",
              400: "#2FB06F",
              500: "#0F8A52",
              600: "#0B6B40",
              700: "#085232",
              800: "#053A24",
              900: "#032416",
              DEFAULT: "#0F8A52",
              foreground: "#FFFFFF",
            },
            focus: "#0F8A52",
          },
        },
      },
    }),
  ],
};
