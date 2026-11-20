import { expect, test } from '@playwright/test';

const email = `e2e+${Date.now()}@example.com`;
const password = 'Password123';
const admin = { email: process.env.E2E_ADMIN_EMAIL ?? '', password: process.env.E2E_ADMIN_PASSWORD ?? '' };

test.describe('storefront', () => {
  test('browse, search and open a product', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/products?q=acid');
    await expect(page.getByRole('article').first()).toBeVisible();
    await page.getByRole('article').first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('no horizontal overflow on key pages', async ({ page }) => {
    for (const p of ['/', '/products', '/categories', '/cart', '/login']) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, p).toBe(false);
    }
  });

  test('unknown routes return 404 and staff areas redirect to login', async ({ page, request }) => {
    expect((await request.get('/definitely-missing')).status()).toBe(404);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test('register, sign in and see an empty order history', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Full name').fill('E2E Customer');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.goto('/account/orders');
    await expect(page.getByText('No orders yet')).toBeVisible();
  });
});

test.describe('admin', () => {
  test.skip(!admin.email, 'Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to run admin specs');
  test('admin can sign in and reach products', async ({ page }) => {
    await page.goto('/login?next=/admin');
    await page.getByLabel('Email').fill(admin.email);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.goto('/admin/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  });
});

test.describe('payments (Razorpay TEST mode)', () => {
  test.skip(!process.env.E2E_PAYMENTS, 'Set E2E_PAYMENTS=1 with Razorpay test keys, a priced in-stock product and a verified customer');
  test('placeholder: complete a test payment through the Razorpay modal', async () => {
    // Drive: add priced variant -> /checkout -> address -> Pay -> Razorpay test card/UPI -> assert /orders/:id?placed=paid.
    // Kept manual/optional because the hosted Razorpay modal requires live network + test credentials.
  });
});
