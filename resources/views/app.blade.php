<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <script nonce="{{ Illuminate\Support\Facades\Vite::cspNonce() }}">
        (function() {
            var stored = localStorage.getItem('theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (stored === 'dark' || (!stored && prefersDark)) {
                document.documentElement.classList.add('dark');
            }
            // Brand theme attribute kept for compatibility; CSS maps every
            // variant to the DESIGN.md Social Proof accent (#0066FF).
            try {
                var brand = localStorage.getItem('resumegen.brand-theme');
                if (brand === 'navy' || brand === 'teal' || brand === 'copper' || brand === 'violet') {
                    document.documentElement.setAttribute('data-brand-theme', brand);
                } else {
                    document.documentElement.setAttribute('data-brand-theme', 'violet');
                }
            } catch (e) {
                document.documentElement.setAttribute('data-brand-theme', 'violet');
            }
        })();
        </script>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @isset($og)
            <meta property="og:title" content="{{ $og['title'] }}" />
            <meta property="og:description" content="{{ $og['description'] }}" />
            <meta property="og:url" content="{{ $og['url'] }}" />
            <meta property="og:type" content="profile" />
            <meta property="og:image" content="{{ $og['image'] }}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="{{ $og['title'] }}" />
            <meta name="twitter:description" content="{{ $og['description'] }}" />
            <meta name="twitter:image" content="{{ $og['image'] }}" />
        @endisset

        <link rel="icon" type="image/svg+xml" href="/r-monogram.svg">
        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Scripts -->
        @routes(null, Illuminate\Support\Facades\Vite::cspNonce())
        @viteReactRefresh
        @vite('resources/js/app.tsx')
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
