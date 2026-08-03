import { defineConfig, devices } from '@playwright/test';

/**
 * Breakpoint smoke tests for pages that don't require auth — Herd serves the
 * app already, so this points at the live dev site rather than spinning up
 * its own server. Authenticated pages (Dashboard/Workstation/Compare) aren't
 * covered here: exercising them needs a seeded test user + login flow, which
 * would duplicate the server/DB setup Dusk (tests/Browser) already owns.
 */
export default defineConfig({
    testDir: './tests/playwright',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://resumegen.test',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'mobile',
            use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } },
        },
        {
            name: 'tablet',
            use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
        },
        {
            name: 'desktop',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
        },
    ],
});
