/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: 'hsl(var(--muted))',
        border: 'hsl(var(--border))',
      },
      fontFamily: {
        geist: ['"Geist Sans"', 'sans-serif'],
      },
      transitionDuration: {
        '1500': '1500ms',
      },
      animation: {
        marquee: 'marquee 20s linear infinite',
        blink: 'blink 1.5s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'typewriter': 'typing 1.5s steps(40, end)',
        'blink-caret': 'blinkCaret .75s step-end infinite',
        'draw-chart': 'drawChart 2s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blink: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        typing: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        blinkCaret: {
          'from, to': { borderColor: 'transparent' },
          '50%': { borderColor: 'hsl(var(--foreground))' },
        },
        drawChart: {
          '0%': { strokeDasharray: '0, 1000' },
          '100%': { strokeDasharray: '1000, 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
