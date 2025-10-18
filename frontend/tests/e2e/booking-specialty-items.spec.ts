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
    
    // Set 0 regular items (specialty only)
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.fill('0');
    await page.waitForTimeout(1000);
    
    // Find Peloton by description
    const pelotonSection = page.locator('div').filter({ 
      hasText: 'Peloton bikes and large equipment moving' 
    }).first();
    await pelotonSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const pelotonPlusButton = pelotonSection.locator('button').filter({ hasText: '+' }).last();
    await pelotonPlusButton.click();
    console.log('✓ Peloton selected');
    await page.waitForTimeout(2000);
    
    // Verify Continue button enabled
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
  
  
  test('Multiple items with quantities (3x Bicycle + 2x Peloton)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    // Set 0 regular items
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.fill('0');
    await page.waitForTimeout(500);
    console.log('✓ Set 0 regular items');
    
    // Find Bicycle by description
    const bicycleSection = page.locator('div').filter({ 
      hasText: 'Professional bicycle delivery' 
    }).first();
    await bicycleSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Add 3 bicycles
    const bicyclePlusButton = bicycleSection.locator('button').filter({ hasText: '+' }).last();
    await bicyclePlusButton.click();
    await page.waitForTimeout(300);
    await bicyclePlusButton.click();
    await page.waitForTimeout(300);
    await bicyclePlusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Added 3x Bicycle');
    
    // Verify quantity shows 3
    const bicycleQuantity = bicycleSection.getByText('3', { exact: true });
    await expect(bicycleQuantity).toBeVisible();
    console.log('✓ Bicycle quantity: 3');
    
    // Find Peloton by description
    const pelotonSection = page.locator('div').filter({ 
      hasText: 'Peloton bikes and large equipment moving' 
    }).first();
    await pelotonSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    // Add 2 Pelotons
    const pelotonPlusButton = pelotonSection.locator('button').filter({ hasText: '+' }).last();
    await pelotonPlusButton.click();
    await page.waitForTimeout(300);
    await pelotonPlusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Added 2x Peloton');
    
    // Verify quantity shows 2
    const pelotonQuantity = pelotonSection.getByText('2', { exact: true });
    await expect(pelotonQuantity).toBeVisible();
    console.log('✓ Peloton quantity: 2');
    
    // Continue to next step
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await expect(page.getByText('Pricing Summary')).toBeVisible();
    console.log('✓ Pricing calculated');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    // STEP 3
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    // STEP 4
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Sarah', 'Johnson');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    // STEP 5 - Verify quantities in review
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Booking Summary')).toBeVisible();
    
    await expect(page.getByText(/3x.*Bicycle/i)).toBeVisible();
    console.log('✓ Review shows: 3x Bicycle');
    
    await expect(page.getByText(/2x.*Peloton/i)).toBeVisible();
    console.log('✓ Review shows: 2x Peloton');
    
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ Multiple specialty items test PASSED!');
  });
  
  
  test('Can decrease quantity with minus button', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    const itemCountInput = page.getByLabel('Number of Items');
    await itemCountInput.fill('0');
    await page.waitForTimeout(500);
    
    // Find Bicycle
    const bicycleSection = page.locator('div').filter({ 
      hasText: 'Professional bicycle delivery' 
    }).first();
    await bicycleSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const bicyclePlusButton = bicycleSection.locator('button').filter({ hasText: '+' }).last();
    
    // Add 5
    for (let i = 0; i < 5; i++) {
      await bicyclePlusButton.click();
      await page.waitForTimeout(200);
    }
    console.log('✓ Added 5x Bicycle');
    
    // Verify shows 5
    let quantity = bicycleSection.getByText('5', { exact: true });
    await expect(quantity).toBeVisible();
    console.log('✓ Verified quantity: 5');
    
    // Find minus button
    const bicycleMinusButton = bicycleSection.locator('button').filter({ hasText: '−' }).first();
    await bicycleMinusButton.click();
    await page.waitForTimeout(300);
    await bicycleMinusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Decreased by 2');
    
    // Should now show 3
    quantity = bicycleSection.getByText('3', { exact: true });
    await expect(quantity).toBeVisible();
    console.log('✓ Quantity now: 3');
    
    // Decrease to 0
    await bicycleMinusButton.click();
    await page.waitForTimeout(200);
    await bicycleMinusButton.click();
    await page.waitForTimeout(200);
    await bicycleMinusButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Decreased to 0');
    
    // Quantity should show 0
    quantity = bicycleSection.getByText('0', { exact: true });
    await expect(quantity).toBeVisible();
    console.log('✓ Quantity: 0 (item removed)');
    
    // Minus button should be disabled
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
    
    // Find Surfboard
    const surfboardSection = page.locator('div').filter({ hasText: 'Surfboard' }).first();
    await surfboardSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    const surfboardPlusButton = surfboardSection.locator('button').filter({ hasText: '+' }).last();
    await surfboardPlusButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ Surfboard selected');
    
    // Verify $350 price
    await expect(surfboardSection.getByText('$350')).toBeVisible();
    console.log('✓ Price: $350');
    
    console.log('✅ Surfboard test PASSED!');
  });
  
});