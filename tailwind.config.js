/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        vf: {
          primary: 'var(--vf-primary)',
          secondary: 'var(--vf-secondary)',
          bg: 'var(--vf-bg)',
          'bg-soft': 'var(--vf-bg-soft)',
          surface: 'var(--vf-surface)',
          surface2: 'var(--vf-surface2)',
          surface3: 'var(--vf-surface3)',
          border: 'var(--vf-border)',
          text: 'var(--vf-text)',
          text2: 'var(--vf-text2)',
          text3: 'var(--vf-text3)',
          success: 'var(--vf-green)',
          danger: 'var(--vf-red)',
          info: 'var(--vf-blue)',
          warning: 'var(--vf-amber)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        vf: '12px',
        'vf-lg': '18px',
        'vf-xl': '24px'
      },
      boxShadow: {
        'vf-card': '0 14px 40px rgba(15, 23, 42, 0.06)',
        'vf-glow': '0 24px 80px rgba(15, 76, 129, 0.12)'
      }
    }
  },
  plugins: []
}
