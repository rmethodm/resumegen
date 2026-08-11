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
                // ── Primitive neutral ramp (warm-tinted, not pure gray) ──
                // Named for value, not role — surface/ink below pin to these.
                neutral: {
                    50: '#f7f7f8',
                    100: '#eeeef0',
                    200: '#dcdde0',
                    300: '#c2c4c9',
                    400: '#9a9da3',
                    500: '#75787f',
                    600: '#585b62',
                    700: '#43454b',
                    800: '#2b2d31',
                    900: '#1c1d20',
                    950: '#101113',
                },
                // ── Primitive accent ramp — same hue as brand.DEFAULT (#5952d2) ──
                accent: {
                    50: '#f0efff',
                    100: '#e1e5ff', // == brand.subtle
                    200: '#c3c3fb',
                    300: '#a29ff2',
                    400: '#8079e6',
                    500: '#5952d2', // == brand.DEFAULT
                    600: '#4842b0',
                    700: '#3c3695', // == brand.accent / brand.light
                    800: '#2c2870',
                    900: '#1f1c50',
                    950: '#131134',
                },
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
                    // Dark-mode remap. Not an inversion: canvas sits near-black
                    // with the same warm tint as light, never pure #000
                    // (tokens.md canvas rule); raised adds luminance rather
                    // than just darkening.
                    dark: '#16171a',
                    'dark-raised': '#1e1f23',
                    'dark-border': '#2f3136',
                },
                ink: {
                    DEFAULT: '#171b1f',
                    muted: '#50565a',
                    faint: '#6d7277',
                    // Warmer than pure white — avoids OLED halation (tokens.md text rule).
                    dark: '#f2f1ee',
                    'dark-muted': '#a8a6a1',
                    'dark-faint': '#7d7b77',
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
            // ── Semantic z-index — replaces raw z-10/20/30/50/[60]/[70]
            // scattered across AuthenticatedLayout, Modal, Dropdown, and
            // every workstation menu with no designed stacking order.
            zIndex: {
                base: '0',
                raised: '1',
                dropdown: '20',
                sticky: '30',
                'modal-backdrop': '40',
                modal: '50',
                toast: '60',
                tooltip: '70',
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
        },
    },

    plugins: [forms],
};
