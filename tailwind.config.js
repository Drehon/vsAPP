/** @type {import('tailwindcss').Config} */
const typography = require('@tailwindcss/typography');

module.exports = {
  content: [
    './src/**/*.{html,js}',
    './lessons/**/*.html',
    './exercises/**/*.html',
    './tests/**/*.html',
    // ADDED: Paths to the new content folders
    './lessonsAN/**/*.html',
    './others/**/*.html',
  ],
  theme: {
    extend: {
      typography: ({ theme }) => ({
        slate: {
          css: {
            '--tw-prose-body': theme('colors.slate[700]'),
            '--tw-prose-headings': theme('colors.slate[900]'),
            '--tw-prose-lead': theme('colors.slate[600]'),
            '--tw-prose-links': theme('colors.indigo[600]'),
            '--tw-prose-bold': theme('colors.slate[900]'),
            '--tw-prose-counters': theme('colors.slate[500]'),
            '--tw-prose-bullets': theme('colors.slate[400]'),
            '--tw-prose-hr': theme('colors.slate[200]'),
            '--tw-prose-quotes': theme('colors.slate[900]'),
            '--tw-prose-quote-borders': theme('colors.slate[200]'),
            '--tw-prose-captions': theme('colors.slate[500]'),
            '--tw-prose-code': theme('colors.slate[900]'),
            '--tw-prose-pre-code': theme('colors.slate[200]'),
            '--tw-prose-pre-bg': theme('colors.slate[800]'),
            '--tw-prose-th-borders': theme('colors.slate[300]'),
            '--tw-prose-td-borders': theme('colors.slate[200]'),
            // Customizations start here
            p: {
              'line-height': '1.5', // Fixes vertical spacing issue
            },
            strong: {
              color: theme('colors.red.600'), // Fixes red highlight issue
            },
          },
        },
        // Custom modifier for yellow highlight
        highlight: {
          css: {
            '--tw-prose-body': theme('colors.yellow.800'),
            'background-color': theme('colors.yellow.100'),
            padding: '0.2em 0.4em',
            'border-radius': '0.25rem',
            'font-weight': '700',
          },
        },
      }),
    },
  },
  plugins: [
    typography,
  ],
};
