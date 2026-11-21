/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand greens (deep forest → fresh leaf)
        primary: "#2D6A4F",
        primaryDark: "#1B4332",
        primaryLight: "#D8F3DC",
        primaryMid: "#52B788",
        // Accent amber (warmth of food)
        accent: "#F4A261",
        accentDark: "#E76F51",
        accentLight: "#FFF3E4",
        // Surfaces (creamy warm whites)
        background: "#FAF7F2",
        surface: "#FFFFFF",
        surfaceWarm: "#FDF6EC",
        // Text
        ink: "#1A1A2E",
        muted: "#6B7280",
        subtle: "#9CA3AF",
        // Borders
        border: "#E5E0D8",
        borderDark: "#D1CBB8",
        // Status / urgency
        fresh: "#2D6A4F",
        freshBg: "#D8F3DC",
        warn: "#B45309",
        warnBg: "#FEF3C7",
        urgent: "#DC2626",
        urgentBg: "#FEE2E2",
        // Info
        info: "#1D4ED8",
        infoLight: "#DBEAFE",
        // Success
        success: "#15803D",
        successLight: "#DCFCE7",
        // Danger
        danger: "#DC2626",
        dangerLight: "#FEE2E2",
        // Trust badges
        gold: "#D97706",
        goldLight: "#FEF3C7",
        silver: "#6B7280",
        silverLight: "#F3F4F6",
        bronze: "#92400E",
        bronzeLight: "#FEF3C7",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        input: "10px",
        button: "12px",
        card: "16px",
        modal: "20px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "card-hover": "0 8px 24px -4px rgba(45,106,79,0.12), 0 2px 8px -2px rgba(0,0,0,0.08)",
        modal: "0 20px 60px -12px rgba(0,0,0,0.25)",
        glow: "0 0 0 3px rgba(45,106,79,0.2)",
        "glow-accent": "0 0 0 3px rgba(244,162,97,0.3)",
        "inner-sm": "inset 0 1px 3px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "slide-in-right": { "0%": { transform: "translateX(100%)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        "slide-out-right": { "0%": { transform: "translateX(0)", opacity: "1" }, "100%": { transform: "translateX(120%)", opacity: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(-6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "slide-up": { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "count-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulse: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "spin-slow": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
        "ping-once": { "75%, 100%": { transform: "scale(1.5)", opacity: "0" } },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-in",
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "count-up": "count-up 0.4s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "spin-slow": "spin-slow 3s linear infinite",
        "ping-once": "ping-once 0.6s ease-out",
      },
      backgroundImage: {
        "food-pattern": "radial-gradient(circle at 20% 50%, rgba(45,106,79,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(244,162,97,0.04) 0%, transparent 50%)",
        "gradient-green": "linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)",
        "gradient-warm": "linear-gradient(135deg, #F4A261 0%, #E76F51 100%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
};
