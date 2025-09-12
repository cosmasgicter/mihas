import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
    await page.goto('https://example.com/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('https://example.com/dashboard');
});

test('user can register', async ({ page }) => {
    await page.goto('https://example.com/register');
    await page.fill('input[name="username"]', 'newuser');
    await page.fill('input[name="password"]', 'newpassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('https://example.com/welcome');
});