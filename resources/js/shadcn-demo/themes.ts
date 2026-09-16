export type ThemeId =
    | 'neutral'
    | 'slate'
    | 'zinc'
    | 'stone'
    | 'ocean'
    | 'emerald'
    | 'rose'
    | 'violet'
    | 'amber'
    | 'teal'
    | 'crimson'
    | 'indigo'
    | 'midnight';

export interface ThemeVars {
    background: string;
    foreground: string;
    card: string;
    'card-foreground': string;
    popover: string;
    'popover-foreground': string;
    primary: string;
    'primary-foreground': string;
    secondary: string;
    'secondary-foreground': string;
    muted: string;
    'muted-foreground': string;
    accent: string;
    'accent-foreground': string;
    destructive: string;
    'destructive-foreground': string;
    success: string;
    'success-foreground': string;
    warning: string;
    'warning-foreground': string;
    border: string;
    input: string;
    ring: string;
}

const WHITE = 'oklch(1 0 0)';
const NEAR_BLACK = 'oklch(0.145 0 0)';
const NEAR_WHITE = 'oklch(0.985 0 0)';

function lightTheme({
    primary,
    primaryForeground = NEAR_WHITE,
    accent,
    neutralHue = 0,
}: {
    primary: string;
    primaryForeground?: string;
    accent: string;
    neutralHue?: number;
}): ThemeVars {
    return {
        background: WHITE,
        foreground: NEAR_BLACK,
        card: WHITE,
        'card-foreground': NEAR_BLACK,
        popover: WHITE,
        'popover-foreground': NEAR_BLACK,
        primary,
        'primary-foreground': primaryForeground,
        secondary: neutralHue ? `oklch(0.97 0.01 ${neutralHue})` : 'oklch(0.97 0 0)',
        'secondary-foreground': NEAR_BLACK,
        muted: neutralHue ? `oklch(0.97 0.01 ${neutralHue})` : 'oklch(0.97 0 0)',
        'muted-foreground': neutralHue ? `oklch(0.552 0.014 ${neutralHue})` : 'oklch(0.556 0 0)',
        accent,
        'accent-foreground': NEAR_BLACK,
        destructive: 'oklch(0.577 0.245 27.325)',
        'destructive-foreground': NEAR_WHITE,
        success: 'oklch(0.62 0.15 145)',
        'success-foreground': NEAR_WHITE,
        warning: 'oklch(0.75 0.16 75)',
        'warning-foreground': NEAR_BLACK,
        border: neutralHue ? `oklch(0.9 0.01 ${neutralHue})` : 'oklch(0.922 0 0)',
        input: neutralHue ? `oklch(0.9 0.01 ${neutralHue})` : 'oklch(0.922 0 0)',
        ring: primary,
    };
}

export const THEMES: { id: ThemeId; label: string; vars: ThemeVars }[] = [
    {
        id: 'neutral',
        label: 'Neutral',
        vars: lightTheme({ primary: 'oklch(0.205 0 0)', accent: 'oklch(0.97 0 0)' }),
    },
    {
        id: 'slate',
        label: 'Slate',
        vars: lightTheme({
            primary: 'oklch(0.35 0.03 255)',
            accent: 'oklch(0.94 0.02 255)',
            neutralHue: 255,
        }),
    },
    {
        id: 'zinc',
        label: 'Zinc',
        vars: lightTheme({
            primary: 'oklch(0.32 0.01 285)',
            accent: 'oklch(0.94 0.005 285)',
            neutralHue: 285,
        }),
    },
    {
        id: 'stone',
        label: 'Stone',
        vars: lightTheme({
            primary: 'oklch(0.38 0.02 60)',
            accent: 'oklch(0.94 0.015 60)',
            neutralHue: 60,
        }),
    },
    {
        id: 'ocean',
        label: 'Ocean Blue',
        vars: lightTheme({ primary: 'oklch(0.55 0.18 245)', accent: 'oklch(0.94 0.04 245)' }),
    },
    {
        id: 'emerald',
        label: 'Emerald',
        vars: lightTheme({ primary: 'oklch(0.52 0.14 155)', accent: 'oklch(0.94 0.05 155)' }),
    },
    {
        id: 'rose',
        label: 'Rose',
        vars: lightTheme({ primary: 'oklch(0.6 0.21 15)', accent: 'oklch(0.94 0.05 15)' }),
    },
    {
        id: 'violet',
        label: 'Violet',
        vars: lightTheme({ primary: 'oklch(0.5 0.22 295)', accent: 'oklch(0.94 0.05 295)' }),
    },
    {
        id: 'amber',
        label: 'Amber',
        vars: lightTheme({
            primary: 'oklch(0.75 0.16 75)',
            primaryForeground: NEAR_BLACK,
            accent: 'oklch(0.94 0.06 75)',
        }),
    },
    {
        id: 'teal',
        label: 'Teal',
        vars: lightTheme({ primary: 'oklch(0.55 0.11 195)', accent: 'oklch(0.94 0.04 195)' }),
    },
    {
        id: 'crimson',
        label: 'Crimson',
        vars: lightTheme({ primary: 'oklch(0.5 0.2 25)', accent: 'oklch(0.94 0.05 25)' }),
    },
    {
        id: 'indigo',
        label: 'Indigo',
        vars: lightTheme({ primary: 'oklch(0.48 0.18 275)', accent: 'oklch(0.94 0.05 275)' }),
    },
    {
        id: 'midnight',
        label: 'Midnight (dark)',
        vars: {
            background: 'oklch(0.16 0.01 260)',
            foreground: 'oklch(0.96 0 0)',
            card: 'oklch(0.2 0.01 260)',
            'card-foreground': 'oklch(0.96 0 0)',
            popover: 'oklch(0.2 0.01 260)',
            'popover-foreground': 'oklch(0.96 0 0)',
            primary: 'oklch(0.7 0.14 245)',
            'primary-foreground': 'oklch(0.16 0.01 260)',
            secondary: 'oklch(0.27 0.01 260)',
            'secondary-foreground': 'oklch(0.96 0 0)',
            muted: 'oklch(0.27 0.01 260)',
            'muted-foreground': 'oklch(0.65 0.01 260)',
            accent: 'oklch(0.3 0.03 245)',
            'accent-foreground': 'oklch(0.96 0 0)',
            destructive: 'oklch(0.6 0.22 27)',
            'destructive-foreground': NEAR_WHITE,
            success: 'oklch(0.65 0.15 145)',
            'success-foreground': 'oklch(0.16 0.01 260)',
            warning: 'oklch(0.78 0.15 75)',
            'warning-foreground': 'oklch(0.16 0.01 260)',
            border: 'oklch(0.3 0.01 260)',
            input: 'oklch(0.3 0.01 260)',
            ring: 'oklch(0.7 0.14 245)',
        },
    },
];
