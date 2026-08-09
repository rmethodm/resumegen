import '../css/app.css';
import './bootstrap';

import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { onCLS, onINP, onLCP } from 'web-vitals';
import ErrorBoundary from './Components/error-boundary';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Dev-only console reporting — no metrics pipeline exists to send these to,
// so this is a manual-check aid, not instrumentation. Wire up a real sink
// (e.g. an analytics endpoint) if this needs to run in production.
if (import.meta.env.DEV) {
    const report = (metric: { name: string; value: number; rating: string }) => {
        console.log(`[web-vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
    };

    onLCP(report);
    onINP(report);
    onCLS(report);
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob<ResolvedComponent>('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        if (!el) {
            throw new Error('Inertia mount element #app not found');
        }

        const root = createRoot(el);

        root.render(
            <ErrorBoundary>
                <App {...props} />
            </ErrorBoundary>,
        );
    },
    progress: {
        color: '#000000',
    },
});
