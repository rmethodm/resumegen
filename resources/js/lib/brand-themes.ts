/**
 * Preview brand accents for the product chrome (buttons, focus, active nav).
 * Default violet matches the shipped tokens; other keys are workstation
 * comparison options — not a permanent multi-theme product feature.
 */

export const BRAND_THEME_STORAGE_KEY = 'resumegen.brand-theme';

export type BrandThemeId = 'violet' | 'navy' | 'teal' | 'copper';

export type BrandThemeOption = {
    id: BrandThemeId;
    label: string;
    /** Solid swatch for the switcher UI */
    swatch: string;
    blurb: string;
};

export const brandThemes: BrandThemeOption[] = [
    {
        id: 'violet',
        label: 'Violet',
        swatch: '#5952d2',
        blurb: 'Current shipped accent',
    },
    {
        id: 'navy',
        label: 'Navy',
        swatch: '#1e3a5f',
        blurb: 'Harbor navy — career / trust',
    },
    {
        id: 'teal',
        label: 'Teal',
        swatch: '#0f766e',
        blurb: 'Mineral teal — cool refresh',
    },
    {
        id: 'copper',
        label: 'Copper',
        swatch: '#b45309',
        blurb: 'Warm copper + softer canvas',
    },
];

const themeIds = new Set<string>(brandThemes.map((t) => t.id));

export function isBrandThemeId(value: string | null | undefined): value is BrandThemeId {
    return typeof value === 'string' && themeIds.has(value);
}

export function parseBrandThemeId(value: string | null | undefined): BrandThemeId {
    return isBrandThemeId(value) ? value : 'violet';
}

/** Apply theme on <html> so CSS variables (and Tailwind brand.*) update. */
export function applyBrandTheme(theme: BrandThemeId): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.setAttribute('data-brand-theme', theme);
}

export function readStoredBrandTheme(): BrandThemeId {
    if (typeof localStorage === 'undefined') {
        return 'violet';
    }

    try {
        return parseBrandThemeId(localStorage.getItem(BRAND_THEME_STORAGE_KEY));
    } catch {
        return 'violet';
    }
}

export function persistBrandTheme(theme: BrandThemeId): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(BRAND_THEME_STORAGE_KEY, theme);
    } catch {
        // Private mode / quota — preview still works for the session via DOM.
    }
}

export function setBrandTheme(theme: BrandThemeId): void {
    applyBrandTheme(theme);
    persistBrandTheme(theme);
}
