// frontend/tests/e2e/helpers.ts
import { Page, expect } from '@playwright/test';

export async function skipAuthStep(page: Page) {
  await page.waitForLoadState('networkidle');
  const getStartedText = page.getByText('Get Started');
  
  if (await getStartedText.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('On Step 0 - Get Started');
    const guestButton = page.getByRole('button', { name: /guest|continue/i }).first();
    if (await guestButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guestButton.click();
      console.log('Clicked continue as guest');
    }
    await page.waitForTimeout(500);
  }
  
  await page.waitForSelector('text=Step 1:', { timeout: 10000 });
  console.log('Now on Step 1');
}

export async function fillAddresses(page: Page) {
  console.log('Filling addresses...');
  
  await page.getByPlaceholder('Start typing your address...').first().fill('123 West 57th Street');
  await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Suite 100');
  await page.getByPlaceholder('New York').first().fill('New York');
  const pickupState = page.locator('select').first();
  await pickupState.selectOption('NY');
  await page.getByPlaceholder('10001').first().fill('10019');
  
  await page.getByPlaceholder('Start typing your address...').nth(1).fill('456 Park Avenue');
  await page.getByPlaceholder('Apt 4B, Suite 200').nth(1).fill('Apt 5B');
  await page.getByPlaceholder('New York').nth(1).fill('New York');
  const deliveryState = page.locator('select').nth(1);
  await deliveryState.selectOption('NY');
  await page.getByPlaceholder('10001').nth(1).fill('10022');
  
  console.log('✓ Addresses filled');
  await page.waitForTimeout(3000);
}

export async function fillCustomerInfo(page: Page, firstName = 'John', lastName = 'Smith') {
  console.log('Filling customer info...');
  await page.getByLabel('First Name').fill(firstName);
  await page.getByLabel('Last Name').fill(lastName);
  await page.getByLabel('Email Address').fill(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`);
  await page.getByLabel('Phone Number').fill('2125551234');
  console.log('✓ Customer info filled');
}

export async function selectDateAndTime(page: Page) {
  console.log('Selecting date and time...');
  
  const calendarButtons = page.locator('.grid.grid-cols-7 button:not([disabled])');
  const firstAvailableDate = calendarButtons.first();
  await firstAvailableDate.scrollIntoViewIfNeeded();
  await firstAvailableDate.click();
  console.log('✓ Date selected');
  
  await page.waitForTimeout(1000);
  
  const morningButton = page.locator('button:has-text("Morning (8 AM - 11 AM)")');
  await morningButton.scrollIntoViewIfNeeded();
  await morningButton.click();
  console.log('✓ Morning time selected');
  
  await page.waitForTimeout(3000);
  await expect(page.getByText('Pricing Summary')).toBeVisible({ timeout: 10000 });
}

export async function acceptTermsAndVerifyPayment(page: Page) {
  console.log('Accepting terms and verifying payment button...');
  
  await expect(page.getByText(/Step (4|5):/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Booking Summary')).toBeVisible();
  
  await page.getByText('Terms of Service Agreement').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  const termsCheckbox = page.locator('input[type="checkbox"]').last();
  await termsCheckbox.scrollIntoViewIfNeeded();
  await termsCheckbox.check({ force: true });
  console.log('✓ Terms accepted');
  
  await page.waitForTimeout(1000);
  
  const paymentButton = page.getByRole('button', { name: /continue to payment/i });
  await expect(paymentButton).toBeEnabled({ timeout: 5000 });
  console.log('✓ Payment button enabled');
}