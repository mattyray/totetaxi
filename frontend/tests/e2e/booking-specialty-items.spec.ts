// frontend/tests/e2e/booking-specialty-items.spec.ts
import { test, expect } from '@playwright/test';
import { skipAuthStep, selectDateAndTime, fillAddresses, fillCustomerInfo, acceptTermsAndVerifyPayment } from './helpers';

test.describe('Specialty Items', () => {
  
  test('Single Peloton ($500)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    // Set 0 regular items
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.fill('0');
    await page.waitForTimeout(1000);
    
    // ✅ FIX: Find Peloton card and click + button
    const pelotonCard = page.locator('div').filter({ hasText: 'Peloton bikes and large equipment moving' }).first();
    await pelotonCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const pelotonPlusButton = pelotonCard.locator('button:has-text("+")').last();
    await pelotonPlusButton.click();
    console.log('✓ Peloton selected');
    await page.waitForTimeout(2000);
    
    // Verify quantity
    await expect(pelotonCard.getByText('1', { exact: true })).toBeVisible();
    console.log('✓ Quantity: 1');
    
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await expect(continueButton).toBeEnabled({ timeout: 10000 });
    console.log('✓ Continue button enabled');
    
    await continueButton.click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Frank', 'Garcia');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ Single Peloton test PASSED!');
  });
  
  
  test('Multiple items - 3x Bicycle + 2x Surfboard', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    await page.getByLabel('Number of Items').fill('0');
    await page.waitForTimeout(500);
    console.log('✓ Set 0 regular items');
    
    // ✅ FIX: Find Bicycle card correctly
    const bicycleCard = page.locator('div').filter({ hasText: 'Bicycle' }).filter({ hasText: '$250 each' }).first();
    await bicycleCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Add 3 bicycles
    const bicyclePlusButton = bicycleCard.locator('button:has-text("+")').last();
    await bicyclePlusButton.click();
    await page.waitForTimeout(300);
    await bicyclePlusButton.click();
    await page.waitForTimeout(300);
    await bicyclePlusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Added 3x Bicycle');
    
    // Verify quantity
    await expect(bicycleCard.getByText('3', { exact: true })).toBeVisible();
    console.log('✓ Bicycle quantity: 3');
    
    // ✅ CHANGED: Use Surfboard instead of Peloton for variety
    const surfboardCard = page.locator('div').filter({ hasText: 'Surfboard' }).filter({ hasText: 'Professional surfboard transport' }).first();
    await surfboardCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const surfboardPlusButton = surfboardCard.locator('button:has-text("+")').last();
    await surfboardPlusButton.click();
    await page.waitForTimeout(300);
    await surfboardPlusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Added 2x Surfboard');
    
    await expect(surfboardCard.getByText('2', { exact: true })).toBeVisible();
    console.log('✓ Surfboard quantity: 2');
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await expect(page.getByText('Pricing Summary')).toBeVisible();
    console.log('✓ Pricing calculated');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Sarah', 'Johnson');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    // Verify quantities in review
    await expect(page.getByText(/Step (4|5):/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Booking Summary')).toBeVisible();
    
    await expect(page.getByText(/3x.*Bicycle/i)).toBeVisible();
    console.log('✓ Review shows: 3x Bicycle');
    
    await expect(page.getByText(/2x.*Surfboard/i)).toBeVisible();
    console.log('✓ Review shows: 2x Surfboard');
    
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ Multiple specialty items test PASSED!');
  });
  
  
  test('Can decrease quantity with minus button', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    await page.getByLabel('Number of Items').fill('0');
    await page.waitForTimeout(500);
    
    // Find Bicycle
    const bicycleCard = page.locator('div').filter({ hasText: 'Bicycle' }).filter({ hasText: '$250 each' }).first();
    await bicycleCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const bicyclePlusButton = bicycleCard.locator('button:has-text("+")').last();
    
    // Add 5
    for (let i = 0; i < 5; i++) {
      await bicyclePlusButton.click();
      await page.waitForTimeout(200);
    }
    console.log('✓ Added 5x Bicycle');
    
    await expect(bicycleCard.getByText('5', { exact: true })).toBeVisible();
    console.log('✓ Verified quantity: 5');
    
    // Find minus button
    const bicycleMinusButton = bicycleCard.locator('button:has-text("−")').first();
    await bicycleMinusButton.click();
    await page.waitForTimeout(300);
    await bicycleMinusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Decreased by 2');
    
    await expect(bicycleCard.getByText('3', { exact: true })).toBeVisible();
    console.log('✓ Quantity now: 3');
    
    // Decrease to 0
    await bicycleMinusButton.click();
    await page.waitForTimeout(200);
    await bicycleMinusButton.click();
    await page.waitForTimeout(200);
    await bicycleMinusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Decreased to 0');
    
    await expect(bicycleCard.getByText('0', { exact: true })).toBeVisible();
    console.log('✓ Quantity: 0 (item removed)');
    
    await expect(bicycleMinusButton).toBeDisabled();
    console.log('✓ Minus button disabled at 0');
    
    console.log('✅ Quantity decrease test PASSED!');
  });
  
  
  test('Surfboard specialty item ($350)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    await page.getByLabel('Number of Items').fill('0');
    await page.waitForTimeout(500);
    
    const surfboardCard = page.locator('div').filter({ hasText: 'Surfboard' }).filter({ hasText: 'Professional surfboard transport' }).first();
    await surfboardCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const surfboardPlusButton = surfboardCard.locator('button:has-text("+")').last();
    await surfboardPlusButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ Surfboard selected');
    
    // ✅ FIX: Use "$350 each" not "$350"
    await expect(surfboardCard.getByText('$350 each')).toBeVisible();
    console.log('✓ Price: $350 each');
    
    console.log('✅ Surfboard test PASSED!');
  });
  
});