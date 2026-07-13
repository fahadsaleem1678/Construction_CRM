import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SiteCore dark token system
        'sc-base':    '#0f0f0f',   // deepest background
        'sc-panel':   '#161616',   // panel / nav background
        'sc-surface': '#1e1e1e',   // cards, form backgrounds
        'sc-raised':  '#262626',   // elevated cards, hover rows
        'sc-border':  '#2e2e2e',   // dividers, borders
        'sc-border2': '#3d3d3d',   // stronger dividers
        'sc-muted':   '#6b7280',   // muted text
        'sc-sub':     '#9ca3af',   // sub text
        'sc-text':    '#e5e7eb',   // primary text
        'sc-bright':  '#f9fafb',   // headings, high-contrast
        // Amber accent — single, locked
        'sc-amber':   '#d97706',   // primary accent
        'sc-amber-h': '#f59e0b',   // hover
        'sc-amber-d': '#b45309',   // pressed / deep
        'sc-amber-m': '#78350f',   // muted amber bg tint
        // Status palette
        'sc-green':   '#16a34a',
        'sc-green-m': '#14532d',
        'sc-red':     '#dc2626',
        'sc-red-m':   '#7f1d1d',
        'sc-blue':    '#2563eb',
        'sc-blue-m':  '#1e3a8a',
        'sc-yellow':  '#ca8a04',
        'sc-yellow-m':'#713f12',
        // Legacy compat (Layout uses these indirectly)
        ink:     '#e5e7eb',
        paper:   '#0f0f0f',
        steel:   '#d97706',
        muted:   '#6b7280',
        line:    '#2e2e2e',
        surface: '#1e1e1e',
        maroon:  '#dc2626',
      },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
      },
      boxShadow: {
        'sc-panel':  '0 0 0 1px #2e2e2e, 0 4px 16px rgba(0,0,0,0.4)',
        'sc-card':   '0 0 0 1px #2e2e2e, 0 2px 8px rgba(0,0,0,0.3)',
        'sc-amber':  '0 0 0 2px #d97706',
        'sc-focus':  '0 0 0 2px #d97706',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%':   { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(-33.33%,0,0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.25s ease-out both',
        'slide-in': 'slide-in 0.2s ease-out both',
        ticker:     'ticker 32s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
