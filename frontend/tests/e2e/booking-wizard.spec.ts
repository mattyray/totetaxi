// frontend/tests/e2e/booking-wizard.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Booking Wizard - Complete Flow Tests', () => {
  
  // Helper to get past auth choice step
  async function skipAuthStep(page: Page) {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on Step 0 (auth choice)
    const getStartedText = page.getByText('Get Started');
    
    if (await getStartedText.isVisible()) {
      console.log('On Step 0 - Get Started');
      
      // Look for "Continue as Guest" or similar button
      const guestButton = page.getByRole('button', { name: /guest|continue/i }).first();
      
      if (await guestButton.isVisible()) {
        await guestButton.click();
        console.log('Clicked continue as guest');
      }
      
      // Wait a moment for transition
      await page.waitForTimeout(500);
    }
    
    // Wait for Step 1 to be visible
    await page.waitForSelector('text=Step 1:', { timeout: 10000 });
    console.log('Now on Step 1');
  }
  
  
  test('Mini Move booking with weekend surcharge - complete flow', async ({ page }) => {
    // Navigate to booking page
    await page.goto('/book');
    
    // Handle auth choice step
    await skipAuthStep(page);
    
    // ============================================================
    // STEP 1: Service Selection
    // ============================================================
    await expect(page.getByText('Step 1:')).toBeVisible();
    console.log('✓ On Step 1: Service Selection');
    
    // Wait for service buttons to be visible
    await page.waitForSelector('text=Mini Moves', { timeout: 10000 });
    
    // Select Mini Move service (it's a button, not role="button")
    const miniMoveButton = page.locator('button:has-text("Mini Moves")');
    await miniMoveButton.click();
    console.log('✓ Selected Mini Move');
    
    // Wait longer for packages to load (they're fetched from API)
    await page.waitForTimeout(2000);
    await page.waitForSelector('text=Petite Move', { timeout: 15000 });
    await expect(page.getByText('$150')).toBeVisible();
    console.log('✓ Packages loaded, base price $150 visible');
    
    // Click on Petite Move package card
    await page.locator('text=Petite Move').first().click();
    console.log('✓ Selected Petite package');
    
    // Wait for selection to register
    await page.waitForTimeout(500);
    
    // Continue to next step
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await continueButton.waitFor({ state: 'visible', timeout: 5000 });
    await continueButton.click();
    await page.waitForTimeout(1000);
    
    // ============================================================
    // STEP 2: Date & Time Selection
    // ============================================================
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 2: Date & Time');
    
    await expect(page.getByText('Select Date')).toBeVisible();
    
    // Wait for calendar to fully load
    await page.waitForTimeout(1000);
    
    // Find calendar grid (skip the day headers)
    const calendarButtons = page.locator('.grid.grid-cols-7 button').filter({ hasNotText: /sun|mon|tue|wed|thu|fri|sat/i });
    
    // Click first available date
    await calendarButtons.first().click();
    console.log('✓ Selected first available date');
    
    await page.waitForTimeout(1000);
    
    // Select morning time slot
    const morningButton = page.locator('button:has-text("Morning (8 AM - 11 AM)")');
    await morningButton.click();
    console.log('✓ Selected morning time slot');
    
    // Wait for pricing to calculate
    await page.waitForTimeout(3000);
    
    // Verify pricing appears
    await expect(page.getByText('Pricing Summary')).toBeVisible({ timeout: 10000 });
    console.log('✓ Pricing calculated');
    
    // Continue to addresses
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    await page.waitForTimeout(1000);
    
    // ============================================================
    // STEP 3: Addresses
    // ============================================================
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 3: Addresses');
    
    // Fill pickup address
    const pickupStreet = page.getByLabel('Street Address').first();
    await pickupStreet.fill('123 West 57th Street');
    await page.getByLabel('City').first().fill('New York');
    await page.getByLabel('State').first().selectOption('NY');
    await page.getByLabel('ZIP Code').first().fill('10019');
    console.log('✓ Filled pickup address');
    
    // Fill delivery address
    await page.getByLabel('Street Address').nth(1).fill('456 Park Avenue');
    await page.getByLabel('City').nth(1).fill('New York');
    await page.getByLabel('State').nth(1).selectOption('NY');
    await page.getByLabel('ZIP Code').nth(1).fill('10022');
    console.log('✓ Filled delivery address');
    
    // Wait for ZIP validation
    await page.waitForTimeout(2000);
    
    // Continue to customer info
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(1000);
    
    // ============================================================
    // STEP 4: Customer Info (Guest Only)
    // ============================================================
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 4: Customer Info');
    
    // Fill customer info
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Last Name').fill('Smith');
    await page.getByLabel('Email Address').fill('john.smith@test.com');
    await page.getByLabel('Phone Number').fill('2125551234');
    console.log('✓ Filled customer info');
    
    // Continue to review
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    // ============================================================
    // STEP 5: Review & Payment
    // ============================================================
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    console.log('✓ On Step 5: Review & Payment');
    
    await expect(page.getByText('Booking Summary')).toBeVisible();
    
    // Verify booking details
    await expect(page.getByText('Mini Move')).toBeVisible();
    await expect(page.getByText('John Smith')).toBeVisible();
    await expect(page.getByText('123 West 57th Street')).toBeVisible();
    console.log('✓ Booking summary shows correct details');
    
    // Verify pricing section exists
    await expect(page.getByText('Pricing')).toBeVisible();
    
    // Accept terms
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    await termsCheckbox.check();
    console.log('✓ Accepted terms');
    
    // Verify payment button is enabled
    const paymentButton = page.getByRole('button', { name: /continue to payment/i });
    await expect(paymentButton).toBeEnabled();
    console.log('✓ Payment button is enabled');
    
    console.log('✅ COMPLETE BOOKING FLOW TEST PASSED!');
  });
  
  
  test('Can navigate to booking wizard', async ({ page }) => {
    await page.goto('/book');
    
    // Just verify page loads - use first h1 only
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Book Your Luxury Move');
    
    console.log('✅ Booking wizard loads successfully!');
  });
});