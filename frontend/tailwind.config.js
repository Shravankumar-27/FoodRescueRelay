/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#166534",
        primaryDark: "#14532D",
        accent: "#D97706",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        ink: "#0F172A",
        muted: "#475569",
        border: "#CBD5E1",
        info: "#0369A1",
        success: "#15803D",
        danger: "#B91C1C",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        input: "10px",
        button: "12px",
        card: "16px",
        modal: "20px",
      },
    },
  },
  plugins: [],
};
