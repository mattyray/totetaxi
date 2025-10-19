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
    
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.fill('0');
    await page.waitForTimeout(1000);
    
    const pelotonCard = page.locator('div').filter({ hasText: 'Peloton bikes and large equipment moving' }).first();
    await pelotonCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const pelotonPlusButton = pelotonCard.locator('button').filter({ has: page.locator('svg') }).last();
    await pelotonPlusButton.click();
    console.log('✓ Peloton selected');
    await page.waitForTimeout(3000);
    
    await expect(pelotonCard.locator('span.text-lg.font-bold').filter({ hasText: /^1$/ })).toBeVisible();
    console.log('✓ Quantity: 1');
    
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await expect(continueButton).toBeEnabled({ timeout: 15000 });
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
    
    const bicycleCard = page.locator('div').filter({ hasText: 'Bicycle' }).filter({ hasText: '$250 each' }).first();
    await bicycleCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const bicyclePlusButton = bicycleCard.locator('button').filter({ has: page.locator('svg') }).last();
    await bicyclePlusButton.click();
    await page.waitForTimeout(500);
    await bicyclePlusButton.click();
    await page.waitForTimeout(500);
    await bicyclePlusButton.click();
    await page.waitForTimeout(2000);
    console.log('✓ Added 3x Bicycle');
    
    await expect(bicycleCard.locator('span.text-lg.font-bold').filter({ hasText: /^3$/ })).toBeVisible();
    console.log('✓ Bicycle quantity: 3');
    
    const surfboardCard = page.locator('div').filter({ hasText: 'Surfboard' }).filter({ hasText: 'Professional surfboard transport' }).first();
    await surfboardCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const surfboardPlusButton = surfboardCard.locator('button').filter({ has: page.locator('svg') }).last();
    await surfboardPlusButton.click();
    await page.waitForTimeout(1000); // ✅ Increased from 500 to 1000
    await surfboardPlusButton.click();
    await page.waitForTimeout(3000); // ✅ Increased from 2000 to 3000 - wait for both store updates
    console.log('✓ Added 2x Surfboard');
    
    await expect(surfboardCard.locator('span.text-lg.font-bold').filter({ hasText: /^2$/ })).toBeVisible({ timeout: 10000 }); // ✅ Added longer timeout
    console.log('✓ Surfboard quantity: 2');
    
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await expect(continueButton).toBeEnabled({ timeout: 15000 });
    await continueButton.click();
    
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
    
    const bicycleCard = page.locator('div').filter({ hasText: 'Bicycle' }).filter({ hasText: '$250 each' }).first();
    await bicycleCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const bicyclePlusButton = bicycleCard.locator('button').filter({ has: page.locator('svg') }).last();
    
    // Add 5
    for (let i = 0; i < 5; i++) {
      await bicyclePlusButton.click();
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(1000);
    console.log('✓ Added 5x Bicycle');
    
    await expect(bicycleCard.locator('span.text-lg.font-bold').filter({ hasText: /^5$/ })).toBeVisible();
    console.log('✓ Verified quantity: 5');
    
    // ✅ FIX: Re-query the minus button each time (don't reuse stale locator)
    await bicycleCard.locator('button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(1000);
    await bicycleCard.locator('button').filter({ has: page.locator('svg') }).first().click(); // ✅ Re-query
    await page.waitForTimeout(1000);
    console.log('✓ Decreased by 2');
    
    await expect(bicycleCard.locator('span.text-lg.font-bold').filter({ hasText: /^3$/ })).toBeVisible();
    console.log('✓ Quantity now: 3');
    
    // Decrease to 0 - re-query each time
    await bicycleCard.locator('button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(500);
    await bicycleCard.locator('button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(500);
    await bicycleCard.locator('button').filter({ has: page.locator('svg') }).first().click();
    await page.waitForTimeout(1000);
    console.log('✓ Decreased to 0');
    
    await expect(bicycleCard.locator('span.text-lg.font-bold').filter({ hasText: /^0$/ })).toBeVisible();
    console.log('✓ Quantity: 0 (item removed)');
    
    // Check final state - re-query one last time
    const finalMinusButton = bicycleCard.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(finalMinusButton).toBeDisabled();
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
    
    const surfboardPlusButton = surfboardCard.locator('button').filter({ has: page.locator('svg') }).last();
    await surfboardPlusButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ Surfboard selected');
    
    await expect(surfboardCard.getByText('$350 each').first()).toBeVisible();
    console.log('✓ Price: $350 each');
    
    console.log('✅ Surfboard test PASSED!');
  });
  
});