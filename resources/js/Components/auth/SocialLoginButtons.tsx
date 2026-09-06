const PROVIDERS = [
    {
        name: 'google',
        label: 'Google',
        icon: (
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.66Z"
                />
                <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
                />
                <path
                    fill="#FBBC05"
                    d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.27a12 12 0 0 0 0 10.74l4-3.09Z"
                />
                <path
                    fill="#EA4335"
                    d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
                />
            </svg>
        ),
    },
    {
        name: 'github',
        label: 'GitHub',
        icon: (
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.53-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.21.66.79.55A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
            </svg>
        ),
    },
    {
        name: 'microsoft',
        label: 'Microsoft',
        icon: (
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
                <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
                <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
                <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
            </svg>
        ),
    },
] as const;

export function SocialLoginButtons() {
    return (
        <div>
            <div className="flex items-center gap-3 text-xs font-semibold text-ink-faint">
                <span className="h-px flex-1 bg-surface-border" />
                or continue with
                <span className="h-px flex-1 bg-surface-border" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
                {PROVIDERS.map((provider) => (
                    <a
                        key={provider.name}
                        href={route('oauth.redirect', provider.name)}
                        className="flex items-center justify-center gap-2 rounded-md border border-surface-border bg-white py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    >
                        {provider.icon}
                        <span className="sr-only">{provider.label}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}
