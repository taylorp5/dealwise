import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic colors mapped to DealWise brand (shadcn/UI compatible)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'var(--brand-blue-hover)',
          foreground: 'hsl(var(--primary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'var(--brand-green-dark)',
          foreground: 'hsl(var(--accent-foreground))',
        },
        ring: 'hsl(var(--ring))',
        // Brand-specific colors (for direct access)
        brand: {
          blue: 'var(--brand-blue)',
          'blue-hover': 'var(--brand-blue-hover)',
          green: 'var(--brand-green)',
          'green-dark': 'var(--brand-green-dark)',
          ink: 'var(--brand-ink)',
          muted: 'var(--brand-muted)',
          border: 'var(--brand-border)',
          background: 'var(--brand-background)',
        },
      },
    },
  },
  plugins: [],
}
export default config

