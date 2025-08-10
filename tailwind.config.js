/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    theme: {
        extend: {
            fontFamily: {
                'sans': ['Inter', 'system-ui', 'sans-serif'],
                'mono': ['Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            colors: {
                gray: {
                    850: '#1f2937',
                    950: '#0f1419',
                },
                blue: {
                    450: '#5a9fd4',
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'slide-in-left': 'slideInLeft 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideInLeft: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                }
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}