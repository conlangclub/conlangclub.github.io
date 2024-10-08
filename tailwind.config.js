const plugin = require('tailwindcss/plugin')

module.exports = {
  content: [
    './_drafts/**/*.html',
    './_includes/**/*.html',
    './_layouts/**/*.html',
    './_posts/*.md',
    './_pidgin/**/*.html',
    './_pidgin/**/*.md',
    './_crossword/**/*.html',
    './_crossword/**/*.md',
    './_zine/**/*.html',
    './_zine/**/*.md',
    './*.md',
    './*.html',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            blockquote: {
              quotes: 'none',
            }
          },
        },
      },
      colors: {
        'conlangpurple': {
          DEFAULT: '#91008c',
        },
        'conlangteal': {
          DEFAULT: '#00839a',
        }
      },
      textShadow: {
        sm: '0 1px 2px var(--tw-shadow-color)',
        DEFAULT: '0 2px 4px var(--tw-shadow-color)',
        lg: '0 8px 16px var(--tw-shadow-color)',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1.5rem',
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function({ addComponents }) {
      addComponents({
        '.container': {
          maxWidth: '100%',
          '@screen sm': {
            maxWidth: '540px',
          },
          '@screen md': {
            maxWidth: '720px',
          },
          '@screen lg': {
            maxWidth: '960px',
          },
          '@screen xl': {
            maxWidth: '1340px',
          },
        }
      })
    },
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          'text-shadow': (value) => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      )
    }),
  ]
}