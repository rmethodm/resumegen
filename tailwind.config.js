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
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    DEFAULT: '#4f46e5',
                    accent: '#7c3aed',
                    light: '#4338ca',
                    subtle: '#eef2ff',
                },
                surface: {
                    DEFAULT: '#f5f5fb',
                    border: '#eeeef5',
                },
                ink: {
                    DEFAULT: '#0f0f1a',
                    muted: '#71717a',
                    faint: '#a0a0b0',
                },
            },
        },
    },

    plugins: [forms],
};
