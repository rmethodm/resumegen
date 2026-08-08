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
                // DESIGN.md's two-face system: Inter for everything, Degular
                // Display is proprietary — Inter 500 (font-medium) at
                // display scale is DESIGN.md's own stated open-source
                // substitute, so `font-display` is the same stack and the
                // distinction is carried by weight/tracking at the call site.
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
                display: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            letterSpacing: {
                // DESIGN.md's eyebrow-uppercase: +1px positive tracking at 14px.
                eyebrow: '0.0715em',
            },
            colors: {
                // Frozen legacy hex — do not use in new UI. Prefer semantic /
                // ramp classes below. Kept only so unmigrated call sites compile.
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

                // Primitive ramps (theme-stable; semantics remap for dark).
                gray: {
                    50: 'rgb(var(--gray-50) / <alpha-value>)',
                    100: 'rgb(var(--gray-100) / <alpha-value>)',
                    200: 'rgb(var(--gray-200) / <alpha-value>)',
                    300: 'rgb(var(--gray-300) / <alpha-value>)',
                    400: 'rgb(var(--gray-400) / <alpha-value>)',
                    500: 'rgb(var(--gray-500) / <alpha-value>)',
                    600: 'rgb(var(--gray-600) / <alpha-value>)',
                    700: 'rgb(var(--gray-700) / <alpha-value>)',
                    800: 'rgb(var(--gray-800) / <alpha-value>)',
                    900: 'rgb(var(--gray-900) / <alpha-value>)',
                    950: 'rgb(var(--gray-950) / <alpha-value>)',
                },
                accent: {
                    50: 'rgb(var(--accent-50) / <alpha-value>)',
                    100: 'rgb(var(--accent-100) / <alpha-value>)',
                    200: 'rgb(var(--accent-200) / <alpha-value>)',
                    300: 'rgb(var(--accent-300) / <alpha-value>)',
                    400: 'rgb(var(--accent-400) / <alpha-value>)',
                    500: 'rgb(var(--accent-500) / <alpha-value>)',
                    600: 'rgb(var(--accent-600) / <alpha-value>)',
                    700: 'rgb(var(--accent-700) / <alpha-value>)',
                    800: 'rgb(var(--accent-800) / <alpha-value>)',
                    900: 'rgb(var(--accent-900) / <alpha-value>)',
                    950: 'rgb(var(--accent-950) / <alpha-value>)',
                },

                // Semantic token spine (resources/css/app.css :root/.dark).
                'surface-canvas': 'rgb(var(--color-surface-canvas) / <alpha-value>)',
                'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
                'surface-overlay': 'rgb(var(--color-surface-overlay) / <alpha-value>)',
                // Same surface as `surface-overlay` (modals, sheets) — separate
                // name for static elevated cards so class names don't read as
                // a dismissible overlay when they aren't one.
                'surface-card': 'rgb(var(--color-surface-overlay) / <alpha-value>)',
                'surface-sunken': 'rgb(var(--color-surface-sunken) / <alpha-value>)',
                'surface-inverse': 'rgb(var(--color-surface-inverse) / <alpha-value>)',

                'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
                'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
                'text-tertiary': 'rgb(var(--color-text-tertiary) / <alpha-value>)',
                'text-on-accent': 'rgb(var(--color-text-on-accent) / <alpha-value>)',
                'text-on-inverse': 'rgb(var(--color-text-on-inverse) / <alpha-value>)',

                'border-subtle': 'rgb(var(--color-border-subtle) / <alpha-value>)',
                'border-default': 'rgb(var(--color-border-default) / <alpha-value>)',
                'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
                'border-focus': 'rgb(var(--color-border-focus) / <alpha-value>)',

                'accent-bg': 'rgb(var(--color-accent-bg) / <alpha-value>)',
                'accent-bg-hover': 'rgb(var(--color-accent-bg-hover) / <alpha-value>)',
                'accent-bg-active': 'rgb(var(--color-accent-bg-active) / <alpha-value>)',
                // Brand-colored text (links, active labels) — not on-accent white.
                'accent-text': 'rgb(var(--color-accent-text) / <alpha-value>)',

                success: {
                    bg: 'rgb(var(--color-success-bg) / <alpha-value>)',
                    text: 'rgb(var(--color-success-text) / <alpha-value>)',
                    border: 'rgb(var(--color-success-border) / <alpha-value>)',
                },
                warning: {
                    bg: 'rgb(var(--color-warning-bg) / <alpha-value>)',
                    text: 'rgb(var(--color-warning-text) / <alpha-value>)',
                    border: 'rgb(var(--color-warning-border) / <alpha-value>)',
                },
                error: {
                    bg: 'rgb(var(--color-error-bg) / <alpha-value>)',
                    text: 'rgb(var(--color-error-text) / <alpha-value>)',
                    border: 'rgb(var(--color-error-border) / <alpha-value>)',
                },
                info: {
                    bg: 'rgb(var(--color-info-bg) / <alpha-value>)',
                    text: 'rgb(var(--color-info-text) / <alpha-value>)',
                    border: 'rgb(var(--color-info-border) / <alpha-value>)',
                },
            },
            borderRadius: {
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
                '2xl': 'var(--radius-2xl)',
                full: 'var(--radius-full)',
                input: 'var(--radius-input)',
                button: 'var(--radius-button)',
                card: 'var(--radius-card)',
                modal: 'var(--radius-modal)',
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
            },
            zIndex: {
                base: 'var(--z-base)',
                raised: 'var(--z-raised)',
                dropdown: 'var(--z-dropdown)',
                sticky: 'var(--z-sticky)',
                'modal-backdrop': 'var(--z-modal-backdrop)',
                modal: 'var(--z-modal)',
                toast: 'var(--z-toast)',
                tooltip: 'var(--z-tooltip)',
            },
            transitionDuration: {
                instant: 'var(--duration-instant)',
                fast: 'var(--duration-fast)',
                normal: 'var(--duration-normal)',
                slow: 'var(--duration-slow)',
            },
            transitionTimingFunction: {
                out: 'var(--ease-out)',
                in: 'var(--ease-in)',
                'in-out': 'var(--ease-in-out)',
            },
        },
    },

    plugins: [forms],
};
