import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*admin/);
});

test('user can register', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.fill('input[type="email"]', 'newuser@test.com');
    await page.fill('input[type="password"]', 'newpassword123');
    await page.fill('input[name="full_name"]', 'New User');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student/);
});