// frontend/tests/e2e/booking-blade-transfer.spec.ts
import { test, expect } from '@playwright/test';
import { skipAuthStep, fillCustomerInfo, acceptTermsAndVerifyPayment } from './helpers';

test.describe('BLADE Airport Transfer', () => {
  
  test('BLADE Transfer - JFK with 2 bags ($150)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    const bladeButton = page.locator('button', { hasText: 'BLADE Airport Transfer' });
    await bladeButton.click();
    await page.waitForTimeout(2000);
    console.log('✓ Selected BLADE Transfer');
    
    // Select JFK
    const jfkButton = page.locator('button').filter({ hasText: 'JFK' }).first();
    await jfkButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Selected JFK');
    
    // Fill flight date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(dateString);
    await page.waitForTimeout(500);
    
    // Fill flight time
    const timeInput = page.locator('input[type="time"]');
    await timeInput.fill('14:30');
    await page.waitForTimeout(500);
    
    // ✅ FIX: Set bag count to 2 AND wait longer for validation
    const bagInput = page.getByLabel('Bag Count');
    await bagInput.fill('2');
    await page.waitForTimeout(2000); // ✅ INCREASED from 1000 to 2000
    console.log('✓ Set 2 bags');
    
    // Verify price
    await expect(page.getByText('Estimated Price: $150')).toBeVisible();
    console.log('✓ Price: $150');
    
    // ✅ FIX: Wait for Continue button to be enabled before clicking
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    await continueButton.click();
    
    // STEP 2: Verify summary
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('BLADE Flight Summary')).toBeVisible();
    await expect(page.getByText('JFK International')).toBeVisible();
    await expect(page.getByText(/Bags Ready Time.*AM/i)).toBeVisible();
    console.log('✓ Flight summary displayed');
    
    await expect(page.getByText('2 bags × $75')).toBeVisible();
    await expect(page.getByText(/No surcharges/i)).toBeVisible();
    console.log('✓ Pricing verified');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    // STEP 3: Addresses
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    
    // Fill NYC pickup
    await page.getByPlaceholder('Start typing your address...').first().fill('123 West 57th Street');
    await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Apt 10B');
    await page.getByPlaceholder('New York').first().fill('New York');
    await page.locator('select').first().selectOption('NY');
    await page.getByPlaceholder('10001').first().fill('10019');
    
    // Verify delivery auto-filled
    await expect(page.getByText('JFK International Airport')).toBeVisible();
    console.log('✓ Delivery auto-filled to JFK');
    
    await page.waitForTimeout(2000);
    const continueToCustomerButton = page.getByRole('button', { name: /continue to review/i });
    await continueToCustomerButton.click();
    
    // STEP 4: Customer Info
    await expect(page.getByText(/Step (4|5):/)).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Alex', 'Turner');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    // STEP 5: Review
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ BLADE JFK test PASSED!');
  });
  
  
  test('BLADE Transfer - EWR with 3 bags ($225)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    const bladeButton = page.locator('button', { hasText: 'BLADE Airport Transfer' });
    await bladeButton.click();
    await page.waitForTimeout(2000);
    
    // Select EWR
    const ewrButton = page.locator('button').filter({ hasText: 'EWR' }).first();
    await ewrButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Selected EWR');
    
    // Fill flight info
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.locator('input[type="date"]').fill(dateString);
    await page.locator('input[type="time"]').fill('18:45');
    
    // ✅ FIX: Add longer wait after bag count
    await page.getByLabel('Bag Count').fill('3');
    await page.waitForTimeout(2000); // ✅ INCREASED
    
    // Verify $225
    await expect(page.getByText('Estimated Price: $225')).toBeVisible();
    console.log('✓ Price: $225 for 3 bags');
    
    // ✅ FIX: Wait for button to be enabled
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    await continueButton.click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    
    // Verify EWR in summary
    await expect(page.getByText(/Newark.*Liberty|EWR/i)).toBeVisible();
    console.log('✓ EWR confirmed');
    
    console.log('✅ BLADE EWR test PASSED!');
  });
  
});