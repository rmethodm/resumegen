<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" type="image/svg+xml" href="/r-monogram.svg">
        <title>@yield('title') — Resumegen</title>
        <style>
            :root {
                --brand: #5952d2;
                --surface: #f2f6f9;
                --border: #d2d8dd;
                --ink: #171b1f;
                --muted: #50565a;
                --faint: #6d7277;
            }
            * { box-sizing: border-box; }
            html, body {
                margin: 0;
                min-height: 100dvh;
                background: var(--surface);
                color: var(--ink);
                font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
                -webkit-font-smoothing: antialiased;
            }
            body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 1.5rem;
            }
            .shell {
                width: 100%;
                max-width: 28rem;
                border-radius: 1.25rem;
                background: rgba(23, 27, 31, 0.03);
                padding: 0.375rem;
                box-shadow: 0 0 0 1px rgba(23, 27, 31, 0.05);
            }
            .core {
                border-radius: calc(1.25rem - 0.375rem);
                background: #fff;
                padding: 2rem 1.75rem;
                box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.65);
                text-align: center;
            }
            .brand {
                display: inline-flex;
                align-items: center;
                gap: 0.6rem;
                text-decoration: none;
                color: var(--ink);
                margin-bottom: 1.5rem;
            }
            .brand img {
                width: 2rem;
                height: 2rem;
            }
            .brand span {
                font-weight: 800;
                font-size: 1.05rem;
                letter-spacing: -0.02em;
            }
            .code {
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--brand);
                margin: 0 0 0.5rem;
            }
            .title {
                font-size: 1.35rem;
                font-weight: 800;
                letter-spacing: -0.02em;
                margin: 0 0 0.5rem;
            }
            .message {
                font-size: 0.9rem;
                line-height: 1.5;
                color: var(--muted);
                margin: 0 0 1.5rem;
            }
            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                justify-content: center;
            }
            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 9999px;
                padding: 0.55rem 1.1rem;
                font-size: 0.875rem;
                font-weight: 600;
                text-decoration: none;
                transition: opacity 0.2s ease;
            }
            .btn:hover { opacity: 0.9; }
            .btn-primary {
                background: var(--brand);
                color: #fff;
            }
            .btn-ghost {
                background: transparent;
                color: var(--muted);
                border: 1px solid var(--border);
            }
        </style>
    </head>
    <body>
        <div class="shell">
            <div class="core">
                <a class="brand" href="{{ url('/') }}">
                    <img src="/r-monogram.svg" alt="" width="32" height="32">
                    <span>Resumegen</span>
                </a>
                <p class="code">@yield('code')</p>
                <h1 class="title">@yield('title')</h1>
                <p class="message">@yield('message')</p>
                <div class="actions">
                    <a class="btn btn-primary" href="{{ url('/') }}">Go home</a>
                    <a class="btn btn-ghost" href="javascript:history.back()">Go back</a>
                </div>
            </div>
        </div>
    </body>
</html>
