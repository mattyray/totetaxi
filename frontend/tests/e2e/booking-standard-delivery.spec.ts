// frontend/tests/e2e/booking-standard-delivery.spec.ts
import { test, expect } from '@playwright/test';
import { skipAuthStep, selectDateAndTime, fillAddresses, fillCustomerInfo, acceptTermsAndVerifyPayment } from './helpers';

test.describe('Standard Delivery', () => {
  
  test('5 regular items', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    // Fill item count
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.scrollIntoViewIfNeeded();
    await itemCountInput.fill('5');
    console.log('✓ Entered 5 items');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Charlie', 'Davis');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ Standard Delivery - 5 items test PASSED!');
  });
  
  
  test('3 regular items + 2x Bicycle (mixed)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    // Set 3 regular items
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.fill('3');
    await page.waitForTimeout(500);
    console.log('✓ Set 3 regular items');
    
    // Add 2 bicycles
    const bicycleSection = page.locator('div').filter({ hasText: 'Bicycle' }).first();
    await bicycleSection.scrollIntoViewIfNeeded();
    
    const bicyclePlusButton = bicycleSection.locator('button').filter({ hasText: '+' }).last();
    await bicyclePlusButton.click();
    await page.waitForTimeout(300);
    await bicyclePlusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Added 2x Bicycle');
    
    // Verify quantity
    await expect(bicycleSection.getByText('2', { exact: true })).toBeVisible();
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    
    // Verify mixed pricing
    await expect(page.getByText('Pricing Summary')).toBeVisible();
    console.log('✓ Mixed pricing calculated');
    
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue/i }).click();
    
    await expect(page.getByText(/Step (4|5):/)).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Mixed', 'Test');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ Mixed delivery test PASSED!');
  });
  
  
  test('Same-Day delivery adds $360 surcharge', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.fill('2');
    await page.waitForTimeout(500);
    
    // Check same-day delivery checkbox
    const sameDayCheckbox = page.locator('input[type="checkbox"]').filter({ 
      has: page.locator('text=/Same.*Day/i') 
    }).first();
    
    await sameDayCheckbox.scrollIntoViewIfNeeded();
    await sameDayCheckbox.check({ force: true });
    await page.waitForTimeout(1000);
    console.log('✓ Same-day delivery selected');
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    
    // Verify $360 surcharge
    await expect(page.getByText('Same-Day Delivery')).toBeVisible();
    await expect(page.getByText('+$360')).toBeVisible();
    console.log('✓ Same-day surcharge $360 displayed');
    
    console.log('✅ Same-day delivery test PASSED!');
  });
  
  
  test('COI adds $50 fee', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    await page.getByLabel('Number of Items').fill('3');
    await page.waitForTimeout(500);
    
    // Check COI checkbox
    const coiCheckbox = page.locator('input[type="checkbox"]').filter({ 
      has: page.locator('text=/Certificate.*Insurance/i') 
    }).first();
    
    await coiCheckbox.scrollIntoViewIfNeeded();
    await coiCheckbox.check({ force: true });
    await page.waitForTimeout(1000);
    console.log('✓ COI selected');
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    
    // Verify $50 COI fee
    await expect(page.getByText('COI Fee')).toBeVisible();
    await expect(page.getByText('+$50')).toBeVisible();
    console.log('✓ COI fee $50 displayed');
    
    console.log('✅ COI test PASSED!');
  });
  
});