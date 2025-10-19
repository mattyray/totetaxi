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
    
    await expect(page.getByText('Airport Selection')).toBeVisible();
    await page.waitForTimeout(1000);
    
    const airportButtons = page.locator('.grid.grid-cols-2 button');
    const jfkButton = airportButtons.filter({ hasText: 'JFK' }).first();
    
    await jfkButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    await jfkButton.click();
    await page.waitForTimeout(300);
    await jfkButton.click();
    await page.waitForTimeout(300);
    await jfkButton.click();
    await page.waitForTimeout(1000);
    
    const jfkClasses = await jfkButton.getAttribute('class');
    console.log('JFK button classes:', jfkClasses);
    
    if (!jfkClasses?.includes('border-navy-500') && !jfkClasses?.includes('bg-navy-50')) {
      throw new Error('❌ JFK button not selected after clicking!');
    }
    console.log('✓ Selected JFK');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(dateString);
    await page.waitForTimeout(500);
    
    const timeInput = page.locator('input[type="time"]');
    await timeInput.fill('14:30');
    await page.waitForTimeout(500);
    
    const bagInput = page.getByLabel('Bag Count');
    await bagInput.scrollIntoViewIfNeeded();
    await bagInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await bagInput.pressSequentially('2', { delay: 100 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(3000);
    console.log('✓ Set 2 bags');
    
    await expect(page.getByText('Estimated Price: $150')).toBeVisible({ timeout: 5000 });
    console.log('✓ Price: $150');
    
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await expect(continueButton).toBeEnabled({ timeout: 10000 });
    await continueButton.click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('BLADE Flight Summary')).toBeVisible();
    await expect(page.getByText('JFK International')).toBeVisible();
    await expect(page.getByText(/Bags Ready Time.*AM/i)).toBeVisible();
    console.log('✓ Flight summary displayed');
    
    await expect(page.getByText('2 bags × $75')).toBeVisible();
    await expect(page.getByText(/No surcharges/i)).toBeVisible();
    console.log('✓ Pricing verified');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    
    await page.getByPlaceholder('Start typing your address...').first().fill('123 West 57th Street');
    await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Apt 10B');
    await page.getByPlaceholder('New York').first().fill('New York');
    await page.locator('select').first().selectOption('NY');
    await page.getByPlaceholder('10001').first().fill('10019');
    
    // ✅ FIX: Check for the readonly message instead
    await expect(page.getByText('Airport address is automatically set')).toBeVisible();
    console.log('✓ Delivery auto-filled to JFK');
    
    await page.waitForTimeout(2000);
    const continueToCustomerButton = page.getByRole('button', { name: /continue to review/i });
    await continueToCustomerButton.click();
    
    await expect(page.getByText(/Step (4|5):/)).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Alex', 'Turner');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
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
    
    await expect(page.getByText('Airport Selection')).toBeVisible();
    await page.waitForTimeout(1000);
    
    const airportButtons = page.locator('.grid.grid-cols-2 button');
    const ewrButton = airportButtons.filter({ hasText: 'EWR' }).first();
    
    await ewrButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    await ewrButton.click();
    await page.waitForTimeout(300);
    await ewrButton.click();
    await page.waitForTimeout(300);
    await ewrButton.click();
    await page.waitForTimeout(1000);
    
    const ewrClasses = await ewrButton.getAttribute('class');
    console.log('EWR button classes:', ewrClasses);
    
    if (!ewrClasses?.includes('border-navy-500') && !ewrClasses?.includes('bg-navy-50')) {
      throw new Error('❌ EWR button not selected after clicking!');
    }
    console.log('✓ Selected EWR');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.locator('input[type="date"]').fill(dateString);
    await page.locator('input[type="time"]').fill('18:45');
    
    const bagInput = page.getByLabel('Bag Count');
    await bagInput.scrollIntoViewIfNeeded();
    await bagInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await bagInput.pressSequentially('3', { delay: 100 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(3000);
    
    await expect(page.getByText('Estimated Price: $225')).toBeVisible({ timeout: 5000 });
    console.log('✓ Price: $225 for 3 bags');
    
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await expect(continueButton).toBeEnabled({ timeout: 10000 });
    await continueButton.click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    
    await expect(page.getByText(/Newark.*Liberty|EWR/i)).toBeVisible();
    console.log('✓ EWR confirmed');
    
    console.log('✅ BLADE EWR test PASSED!');
  });
  
});