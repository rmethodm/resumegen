import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/**
 * Theme adopted from the option 3 builder mockup
 * (docs/resume-builder-option-3-template.html), which is the source of truth
 * for the app's visual system as of 2026-07-21.
 *
 * `gray` is OVERRIDDEN, not extended — the existing `*-gray-*` classes across
 * the app retheme themselves with no component edits. The ramp is the mockup's
 * own slate scale, anchored on its named tokens: 100 is --bg, 300 is --border,
 * 500 is --muted, 700 is --ink-soft, 900 is --ink.
 */
const gray = {
    50: '#f9fbff',
    100: '#f6f8fb',
    200: '#e8edf5',
    300: '#dbe3ef',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#111827',
    950: '#0b1220',
};

/**
 * Blue ramp anchored so brand-600 is the mockup's --primary-2 (#2563eb) and
 * brand-900 its --primary navy (#17213a), the colour its solid buttons use.
 */
const brand = {
    50: '#eaf1ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#17213a',
};

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
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },

            colors: {
                gray,
                brand,
                success: '#16a34a',
                warning: '#d97706',
                danger: '#dc2626',
            },

            boxShadow: {
                'card-sm': '0 1px 2px rgba(15, 23, 42, .06)',
                'card-md': '0 16px 40px rgba(15, 23, 42, .08)',
            },
        },
    },

    plugins: [forms],
};
