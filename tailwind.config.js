import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',

    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['IBM Plex Sans', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    DEFAULT: '#5952d2',
                    accent: '#3c3695',
                    light: '#3c3695',
                    subtle: '#e1e5ff',
                },
                surface: {
                    DEFAULT: '#f2f6f9',
                    border: '#d2d8dd',
                },
                ink: {
                    DEFAULT: '#171b1f',
                    muted: '#50565a',
                    faint: '#6d7277',
                },
                success: {
                    DEFAULT: '#059669',
                    subtle: '#d1fae5',
                    text: '#065f46',
                },
                warning: {
                    DEFAULT: '#d97706',
                    subtle: '#fef3c7',
                    text: '#92400e',
                },
                danger: {
                    DEFAULT: '#dc2626',
                    subtle: '#fee2e2',
                    text: '#991b1b',
                },
            },
            boxShadow: {
                card: '0 1px 2px rgba(0,0,0,0.04)',
            },
        },
    },

    plugins: [forms],
};
