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
    
    // Click Mini Moves button to select it
    const miniMoveButton = page.locator('button:has-text("Mini Moves")');
    await miniMoveButton.click();
    console.log('✓ Clicked Mini Moves');
    
    // Wait for packages to load after clicking
    await page.waitForTimeout(2000);
    
    // Verify packages loaded
    await expect(page.getByText('Select Package')).toBeVisible();
    await expect(page.getByText('Petite')).toBeVisible();
    await expect(page.getByText('$995')).toBeVisible();
    console.log('✓ Packages loaded');
    
    // Click on Petite package - use heading role with force click
    await page.getByRole('heading', { name: 'Petite', exact: true }).click({ force: true });
    console.log('✓ Clicked Petite package');
    
    await page.waitForTimeout(1500);
    
    // Verify continue button is now enabled
    const continueButton = page.getByRole('button', { name: /continue to date/i });
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
    
    // Wait for calendar to load
    await page.waitForTimeout(1000);
    
    // Click first available date in calendar
    const calendarButtons = page.locator('.grid.grid-cols-7 button').filter({ 
      hasNotText: /sun|mon|tue|wed|thu|fri|sat/i 
    });
    await calendarButtons.first().click();
    console.log('✓ Selected date');
    
    await page.waitForTimeout(1000);
    
    // Select morning time slot
    await page.locator('button:has-text("Morning (8 AM - 11 AM)")').click();
    console.log('✓ Selected morning time');
    
    // Wait for pricing to calculate
    await page.waitForTimeout(3000);
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
    
    // Fill addresses
    await page.getByLabel('Street Address').first().fill('123 West 57th Street');
    await page.getByLabel('City').first().fill('New York');
    await page.getByLabel('State').first().selectOption('NY');
    await page.getByLabel('ZIP Code').first().fill('10019');
    
    await page.getByLabel('Street Address').nth(1).fill('456 Park Avenue');
    await page.getByLabel('City').nth(1).fill('New York');
    await page.getByLabel('State').nth(1).selectOption('NY');
    await page.getByLabel('ZIP Code').nth(1).fill('10022');
    console.log('✓ Filled addresses');
    
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /continue to review/i }).click();
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
    
    await page.getByRole('button', { name: /continue to review/i }).click();
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
    
    // Accept terms
    await page.locator('input[type="checkbox"]').first().check();
    console.log('✓ Accepted terms');
    
    // Verify payment button is enabled
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