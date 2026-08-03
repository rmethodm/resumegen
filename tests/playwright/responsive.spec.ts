import { expect, test } from '@playwright/test';

const PAGES = [
    { path: '/', name: 'Welcome' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
];

for (const { path, name } of PAGES) {
    test(`${name} has no horizontal overflow`, async ({ page }) => {
        await page.goto(path);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
        }));

        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
}

test('Login form is usable at the current viewport', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
});

test('Register form is usable at the current viewport', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
});
