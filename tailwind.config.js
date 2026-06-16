/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Telekom Scale Design Guidelines (telekom.github.io/scale) – Markenfarbe "Telekom Magenta" #E20074.
        // Tonwertskala für Hover/Active/Disabled an die Scale Design Tokens angelehnt;
        // Dark-Mode-Varianten sind aufgehellt für ausreichenden Kontrast auf dem dunklen App-Hintergrund (#0e0d14).
        primary: {
          DEFAULT: '#E20074',
          hover: '#C70062',
          active: '#A20050',
          light: '#FCE5F1',
          disabled: '#F1A8CE',
          dark: '#FF0A78',
          'dark-hover': '#FF4FA0',
          'dark-active': '#E2006A',
        }
      }
    }
  },
  plugins: []
}

