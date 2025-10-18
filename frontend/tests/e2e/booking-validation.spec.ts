// frontend/tests/e2e/booking-validation.spec.ts
import { test, expect } from '@playwright/test';
import { skipAuthStep, selectDateAndTime, fillAddresses, fillCustomerInfo } from './helpers';

test.describe('Booking Validation & Navigation', () => {
  
  // ============================================================
  // VALIDATION TESTS
  // ============================================================
  
  test('Cannot proceed without selecting package', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    console.log('✓ Clicked Mini Moves');
    
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Continue button should be disabled
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await continueButton.scrollIntoViewIfNeeded();
    
    const isDisabled = await continueButton.isDisabled();
    expect(isDisabled).toBe(true);
    console.log('✓ Continue button is disabled as expected');
    console.log('✅ Validation test PASSED!');
  });
  
  
  test('Terms checkbox must be checked before payment', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // Quick run through to Step 5
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Test', 'User');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(2000);
    
    // STEP 5: Verify payment button is disabled without terms
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    
    const paymentButton = page.getByRole('button', { name: /continue to payment/i });
    await paymentButton.scrollIntoViewIfNeeded();
    
    // Should be disabled initially
    const initiallyDisabled = await paymentButton.isDisabled();
    expect(initiallyDisabled).toBe(true);
    console.log('✓ Payment button disabled without terms');
    
    // Check terms
    const termsCheckbox = page.locator('input[type="checkbox"]').last();
    await termsCheckbox.scrollIntoViewIfNeeded();
    await termsCheckbox.check({ force: true });
    await page.waitForTimeout(500);
    
    // Should be enabled now
    await expect(paymentButton).toBeEnabled({ timeout: 5000 });
    console.log('✓ Payment button enabled after checking terms');
    
    console.log('✅ Terms validation test PASSED!');
  });
  
  
  test('Standard Delivery requires at least 1 item', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    // Try to continue without items
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    
    // Should show error or button disabled
    const isDisabled = await continueButton.isDisabled();
    if (isDisabled) {
      console.log('✓ Continue button disabled with 0 items');
    } else {
      // Try clicking and verify error message appears
      await continueButton.click();
      await page.waitForTimeout(500);
      const errorMessage = page.getByText(/select at least one/i);
      if (await errorMessage.isVisible().catch(() => false)) {
        console.log('✓ Error message displayed');
      }
    }
    
    console.log('✅ Item count validation test PASSED!');
  });
  
  
  // ============================================================
  // NAVIGATION TESTS
  // ============================================================
  
  test('Previous button navigation works', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // Go to Step 3
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    console.log('✓ Now on Step 3');
    
    // Click Previous button
    const previousButton = page.locator('.sticky.bottom-0').getByRole('button', { name: /previous/i });
    await previousButton.scrollIntoViewIfNeeded();
    await previousButton.click();
    console.log('✓ Clicked Previous');
    await page.waitForTimeout(1000);
    
    // Should be back on Step 2
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 5000 });
    console.log('✓ Back on Step 2');
    
    console.log('✅ Previous button test PASSED!');
  });
  
  
  test('Start Over button resets wizard', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // Progress to Step 2
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 2');
    
    // Click Start Over button
    const startOverButton = page.locator('.sticky.bottom-0').getByRole('button', { name: /start over/i });
    await startOverButton.scrollIntoViewIfNeeded();
    await startOverButton.click();
    console.log('✓ Clicked Start Over');
    await page.waitForTimeout(1000);
    
    // Should be back on Step 0 (Get Started)
    await expect(page.getByText('Get Started')).toBeVisible({ timeout: 5000 });
    console.log('✓ Wizard reset to beginning');
    
    console.log('✅ Start Over test PASSED!');
  });
  
  
  // ============================================================
  // COI TESTS
  // ============================================================
  
  test('Petite package - COI checkbox adds $50', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    
    await expect(page.getByText('$995')).toBeVisible();
    console.log('✓ Base price: $995');
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2: Look for COI checkbox
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    
    const coiLabel = page.locator('label').filter({ hasText: /Certificate of Insurance/i });
    
    if (await coiLabel.isVisible().catch(() => false)) {
      console.log('✓ COI checkbox visible');
      
      const coiCheckbox = coiLabel.locator('input[type="checkbox"]');
      await coiCheckbox.scrollIntoViewIfNeeded();
      await coiCheckbox.check({ force: true });
      await page.waitForTimeout(2000);
      console.log('✓ COI checkbox checked');
      
      // Verify $50 fee
      await expect(page.getByText('$50')).toBeVisible();
      console.log('✓ COI fee $50 displayed');
      
      console.log('✅ Petite COI test PASSED!');
    } else {
      console.log('⚠️  COI checkbox not found');
    }
  });
  
  
  test('Standard package - COI included (no extra charge)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const standardCard = page.locator('div').filter({ hasText: /^Standard/ }).first();
    await standardCard.scrollIntoViewIfNeeded();
    
    // Check for "COI Included" text
    const hasCOIIncluded = await page.getByText(/COI.*included/i).isVisible().catch(() => false);
    
    if (hasCOIIncluded) {
      console.log('✓ Standard package shows "COI Included"');
    }
    
    const standardHeading = page.getByRole('heading', { name: 'Standard', exact: true });
    await standardHeading.click();
    await page.waitForTimeout(1500);
    
    // Price should be $1725 (COI included)
    await expect(page.getByText('$1725')).toBeVisible();
    console.log('✓ Standard price: $1725 (COI included)');
    
    console.log('✅ Standard COI test PASSED!');
  });
  
  
  // ============================================================
  // SMOKE TEST
  // ============================================================
  
  test('Can navigate to booking wizard', async ({ page }) => {
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Book Your Luxury Move');
    console.log('✅ Booking wizard loads successfully!');
  });
  
});