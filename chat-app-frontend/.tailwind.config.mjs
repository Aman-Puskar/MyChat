  // tailwind.config.mjs
  import { defineConfig } from 'tailwindcss'

  export default defineConfig({
    darkMode: 'class',
    content: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        animation: {
          'bounce-once': 'bounce 1s ease-in-out 1',
        },
      },
    },
    plugins: [
        require('tailwind-scrollbar'),

    ],
  })
