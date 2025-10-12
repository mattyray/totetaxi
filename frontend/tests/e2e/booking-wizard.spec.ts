// frontend/tests/e2e/booking-wizard.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Booking Wizard - Complete Flow Tests', () => {
  
  async function skipAuthStep(page: Page) {
    await page.waitForLoadState('networkidle');
    const getStartedText = page.getByText('Get Started');
    
    if (await getStartedText.isVisible()) {
      console.log('On Step 0 - Get Started');
      const guestButton = page.getByRole('button', { name: /guest|continue/i }).first();
      if (await guestButton.isVisible()) {
        await guestButton.click();
        console.log('Clicked continue as guest');
      }
      await page.waitForTimeout(500);
    }
    
    await page.waitForSelector('text=Step 1:', { timeout: 10000 });
    console.log('Now on Step 1');
  }
  
  
  test('Mini Move booking - complete flow', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // ============================================================
    // STEP 1: Service Selection
    // ============================================================
    await expect(page.getByText('Step 1:')).toBeVisible();
    console.log('✓ On Step 1: Service Selection');
    
    // Click Mini Moves
    const miniMoveButton = page.locator('button:has-text("Mini Moves")');
    await miniMoveButton.click();
    console.log('✓ Clicked Mini Moves');
    
    // Wait for packages to load
    await page.waitForTimeout(3000);
    
    // Scroll to "Select Package" heading to ensure packages are in view
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Verify packages loaded
    await expect(page.getByText('Petite')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('$995')).toBeVisible();
    console.log('✓ Packages visible');
    
    // Scroll to Petite card and click
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await petiteHeading.click();
    console.log('✓ Clicked Petite');
    
    await page.waitForTimeout(1500);
    
    // Continue button should be enabled
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await continueButton.scrollIntoViewIfNeeded();
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    console.log('✓ Continue button enabled');
    
    await continueButton.click();
    console.log('✓ Continuing to Step 2');
    await page.waitForTimeout(1000);
    
    // ============================================================
    // STEP 2: Date & Time Selection
    // ============================================================
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 2: Date & Time');
    
    await page.waitForTimeout(1000);
    
    // Click first enabled date button (exclude disabled past dates)
    const calendarButtons = page.locator('.grid.grid-cols-7 button:not([disabled])');
    const firstAvailableDate = calendarButtons.first();
    await firstAvailableDate.scrollIntoViewIfNeeded();
    await firstAvailableDate.click();
    console.log('✓ Selected date');
    
    await page.waitForTimeout(1000);
    
    // Select morning time slot
    const morningButton = page.locator('button:has-text("Morning (8 AM - 11 AM)")');
    await morningButton.scrollIntoViewIfNeeded();
    await morningButton.click();
    console.log('✓ Selected morning time');
    
    await page.waitForTimeout(3000);
    await expect(page.getByText('Pricing Summary')).toBeVisible({ timeout: 10000 });
    console.log('✓ Pricing calculated');
    
    const addressButton = page.getByRole('button', { name: /continue to addresses/i });
    await addressButton.scrollIntoViewIfNeeded();
    await addressButton.click();
    await page.waitForTimeout(1000);
    
    // ============================================================
    // STEP 3: Addresses
    // ============================================================
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 3: Addresses');
    
    // Fill pickup address - use placeholder text since labels aren't properly associated
    await page.getByPlaceholder('Start typing your address...').first().fill('123 West 57th Street');
    await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Suite 100');
    await page.getByPlaceholder('New York').first().fill('New York');
    
    // Select state dropdown - first combobox is pickup state
    const pickupState = page.locator('select, combobox').first();
    await pickupState.selectOption('NY');
    
    await page.getByPlaceholder('10001').first().fill('10019');
    console.log('✓ Filled pickup address');
    
    // Fill delivery address - second set of fields
    await page.getByPlaceholder('Start typing your address...').nth(1).fill('456 Park Avenue');
    await page.getByPlaceholder('Apt 4B, Suite 200').nth(1).fill('Apt 5B');
    await page.getByPlaceholder('New York').nth(1).fill('New York');
    
    // Select state dropdown - second combobox is delivery state
    const deliveryState = page.locator('select, combobox').nth(1);
    await deliveryState.selectOption('NY');
    
    await page.getByPlaceholder('10001').nth(1).fill('10022');
    console.log('✓ Filled delivery addresses');
    
    await page.waitForTimeout(2000);
    
    const reviewButton = page.getByRole('button', { name: /continue to review/i });
    await reviewButton.scrollIntoViewIfNeeded();
    await reviewButton.click();
    await page.waitForTimeout(1000);
    
    // ============================================================
    // STEP 4: Customer Info
    // ============================================================
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 4: Customer Info');
    
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Last Name').fill('Smith');
    await page.getByLabel('Email Address').fill('john.smith@test.com');
    await page.getByLabel('Phone Number').fill('2125551234');
    console.log('✓ Filled customer info');
    
    const finalReviewButton = page.getByRole('button', { name: /continue to review/i });
    await finalReviewButton.scrollIntoViewIfNeeded();
    await finalReviewButton.click();
    await page.waitForTimeout(2000);
    
    // ============================================================
    // STEP 5: Review & Payment
    // ============================================================
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 5: Review & Payment');
    
    await expect(page.getByText('Booking Summary')).toBeVisible();
    await expect(page.getByText('Mini Move')).toBeVisible();
    await expect(page.getByText('John Smith')).toBeVisible();
    console.log('✓ Booking summary correct');
    
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await termsCheckbox.scrollIntoViewIfNeeded();
    await termsCheckbox.check();
    console.log('✓ Accepted terms');
    
    await expect(page.getByRole('button', { name: /continue to payment/i })).toBeEnabled();
    console.log('✅ COMPLETE BOOKING FLOW TEST PASSED!');
  });
  
  
  test('Can navigate to booking wizard', async ({ page }) => {
    await page.goto('/book');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Book Your Luxury Move');
    console.log('✅ Booking wizard loads successfully!');
  });
});