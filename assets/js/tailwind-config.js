const tailwindConfig = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "oklch(0.14 0.005 60)",
        foreground: "oklch(0.97 0.005 80)",
        card: "oklch(0.18 0.006 60)",
        "card-foreground": "oklch(0.97 0.005 80)",
        popover: "oklch(0.18 0.006 60)",
        "popover-foreground": "oklch(0.97 0.005 80)",
        primary: "oklch(0.97 0.005 80)",
        "primary-foreground": "oklch(0.12 0.005 60)",
        secondary: "oklch(0.24 0.007 60)",
        "secondary-foreground": "oklch(0.97 0.005 80)",
        muted: "oklch(0.22 0.006 60)",
        "muted-foreground": "oklch(0.62 0.01 70)",
        accent: "oklch(0.28 0.008 60)",
        "accent-foreground": "oklch(0.97 0.005 80)",
        destructive: "oklch(0.58 0.22 25)",
        "destructive-foreground": "oklch(0.99 0.005 80)",
        success: "oklch(0.68 0.15 145)",
        "success-foreground": "oklch(0.12 0.02 145)",
        warning: "oklch(0.78 0.16 75)",
        "warning-foreground": "oklch(0.18 0.02 75)",
        border: "oklch(0.26 0.007 60)",
        input: "oklch(0.22 0.006 60)",
        ring: "oklch(0.55 0.01 70)",
        sekulo: "oklch(0.97 0.005 80)",
        "sekulo-foreground": "oklch(0.12 0.005 60)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "monospace"]
      }
    }
  }
};

tailwind.config = tailwindConfig;
