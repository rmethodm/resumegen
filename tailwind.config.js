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
                // Marketing display only — body UI stays IBM Plex.
                display: ['"Source Serif 4"', 'Georgia', 'Times New Roman', 'serif'],
            },
            colors: {
                brand: {
                    DEFAULT: '#5952d2',
                    accent: '#3c3695',
                    light: '#3c3695',
                    subtle: '#e1e5ff',
                    // Slightly desaturated fill for large marketing CTAs.
                    soft: '#5e58c4',
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
                // Soft Structuralism ambient lift — low contrast, highly diffused.
                ambient: '0 8px 30px rgba(23, 27, 31, 0.06), 0 1px 2px rgba(23, 27, 31, 0.04)',
                shell: 'inset 0 1px 1px rgba(255, 255, 255, 0.65)',
            },
            transitionTimingFunction: {
                soft: 'cubic-bezier(0.32, 0.72, 0, 1)',
            },
            transitionDuration: {
                soft: '320ms',
            },
            borderRadius: {
                shell: '1.25rem',
                core: 'calc(1.25rem - 0.375rem)',
            },
        },
    },

    plugins: [forms],
};
