/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./lessons/**/*.html",
    "./exercises/**/*.html"
  ],
  theme: {
    extend: {
      // This is the correct way to customize the typography plugin
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            'code': {
              fontFamily: 'Source Code Pro, monospace',
              backgroundColor: theme('colors.slate.200'),
              color: '#be123c', // This is the hex code for rose-700
              padding: '0.2em 0.4em',
              margin: '0',
              fontSize: '0.875em',
              borderRadius: '0.25rem',
              fontWeight: '600',
            },
            'strong': {
              color: theme('colors.slate.800'),
            },
            // You can add other prose overrides here if needed
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
