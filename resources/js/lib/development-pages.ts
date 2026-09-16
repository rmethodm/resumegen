import type { ResolvedComponent } from '@inertiajs/react';

// Development pages share one eagerly loaded module graph. Keeping this in a
// dev-only module lets production retain its per-page lazy chunks.
const pages = import.meta.glob<{ default: ResolvedComponent }>('../Pages/**/*.tsx', { eager: true });

export function resolveDevelopmentPage(name: string): { default: ResolvedComponent } {
    const page = pages[`../Pages/${name}.tsx`];
    if (!page) {
        throw new Error(`Page not found: ${name}`);
    }
    return page;
}
