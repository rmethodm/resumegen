import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Label } from '@/Components/ui/label';
import { Select } from '@/Components/ui/select';
import { applyTheme, THEMES } from '@/lib/shadcn-themes';

export default function ThemeForm({ currentTheme }: { currentTheme: string | null }) {
    const [theme, setTheme] = useState(currentTheme ?? '');

    function change(next: string) {
        setTheme(next);
        applyTheme(next || null);
        router.patch(route('theme.update'), { theme: next || null }, { preserveScroll: true });
    }

    return (
        <section>
            <header>
                <h2 className="text-lg font-medium text-foreground">Theme</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Pick a color theme for the whole app. Applies instantly and stays saved to your account.
                </p>
            </header>

            <div className="mt-4 max-w-xs">
                <Label htmlFor="theme-select" className="sr-only">Theme</Label>
                <Select id="theme-select" value={theme} onChange={(e) => change(e.target.value)}>
                    <option value="">Default</option>
                    {THEMES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                </Select>
            </div>
        </section>
    );
}
