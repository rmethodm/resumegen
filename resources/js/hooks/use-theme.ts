import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { PageProps } from '@/types';
import { applyTheme } from '@/lib/shadcn-themes';

/** Applies the signed-in user's saved theme (or reverts to default) on mount and whenever it changes. */
export function useTheme(): void {
    const theme = usePage<PageProps>().props.auth.user.theme;

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);
}
