import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { AxiosInstance } from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { PageProps as AppPageProps } from './';

declare global {
    interface Window {
        axios: AxiosInstance;
    }

    /* eslint-disable no-var */
    var route: typeof ziggyRoute;
}

declare module '@inertiajs/core' {
    interface PageProps extends InertiaPageProps, AppPageProps {}
}

declare module 'react' {
    /**
     * Dusk resolves its `@name` selectors to `[dusk="name"]`, so browser tests
     * need the attribute on the element. React passes it through to the DOM
     * fine; only the types don't know about it.
     */
    interface HTMLAttributes<T> {
        dusk?: string;
    }
}
