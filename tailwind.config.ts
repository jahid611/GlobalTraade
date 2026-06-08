import type { Config } from "tailwindcss";

const palette = {
  c1: '#3533b1',
  c2: '#d2d1dd',
  c3: '#2b2a2f',
  c4: '#9b99c9',
  c5: '#7872fb',
  c6: '#acabb1',
  c7: '#5955e8',
  c8: '#3c39db',
};

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: palette.c4,
        input: palette.c1,
        ring: palette.c5,
        background: palette.c3,
        foreground: palette.c2,
        primary: {
          DEFAULT: palette.c7,
          foreground: palette.c2,
        },
        secondary: {
          DEFAULT: palette.c8,
          foreground: palette.c2,
        },
        destructive: {
          DEFAULT: palette.c1,
          foreground: palette.c2,
        },
        muted: {
          DEFAULT: palette.c4,
          foreground: palette.c3,
        },
        accent: {
          DEFAULT: palette.c5,
          foreground: palette.c2,
        },
        popover: {
          DEFAULT: palette.c3,
          foreground: palette.c2,
        },
        card: {
          DEFAULT: palette.c3,
          foreground: palette.c2,
        },
        white: palette.c2,
        black: palette.c3,
        slate: {
          100: palette.c2,
          200: palette.c2,
          300: palette.c6,
          400: palette.c6,
          500: palette.c4,
          600: palette.c4,
          700: palette.c3,
          800: palette.c3,
          900: palette.c3,
        },
        gray: {
          100: palette.c2,
          200: palette.c2,
          300: palette.c6,
          400: palette.c6,
          500: palette.c4,
          600: palette.c4,
          700: palette.c3,
          800: palette.c3,
          900: palette.c3,
        },
        zinc: {
          100: palette.c2,
          200: palette.c2,
          300: palette.c6,
          400: palette.c6,
          500: palette.c4,
          600: palette.c4,
          700: palette.c3,
          800: palette.c3,
          900: palette.c3,
        },
        blue: {
          100: palette.c2,
          200: palette.c4,
          300: palette.c6,
          400: palette.c5,
          500: palette.c7,
          600: palette.c8,
          700: palette.c1,
          800: palette.c3,
          900: palette.c3,
        },
        emerald: {
          100: palette.c2,
          200: palette.c4,
          300: palette.c6,
          400: palette.c7,
          500: palette.c8,
          600: palette.c1,
          700: palette.c1,
          800: palette.c3,
          900: palette.c3,
        },
        green: {
          400: palette.c7,
          500: palette.c8,
          600: palette.c1,
        },
        red: {
          100: palette.c4,
          200: palette.c4,
          300: palette.c1,
          400: palette.c1,
          500: palette.c1,
          600: palette.c1,
          700: palette.c1,
          800: palette.c3,
          900: palette.c3,
        },
        rose: {
          400: palette.c1,
          500: palette.c1,
        },
        amber: {
          400: palette.c5,
          500: palette.c7,
          600: palette.c8,
          700: palette.c1,
          800: palette.c3,
        },
        yellow: {
          400: palette.c5,
          500: palette.c7,
          600: palette.c8,
          700: palette.c1,
          800: palette.c3,
        },
        orange: {
          400: palette.c5,
          500: palette.c7,
          600: palette.c8,
          700: palette.c1,
          800: palette.c3,
        },
        cyan: {
          400: palette.c7,
          500: palette.c8,
        },
        indigo: {
          400: palette.c7,
          500: palette.c8,
        },
        purple: {
          400: palette.c5,
          500: palette.c5,
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;