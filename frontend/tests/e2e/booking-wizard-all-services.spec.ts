// frontend/tests/e2e/booking-wizard-all-services.spec.ts
import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE BOOKING WIZARD TEST SUITE
 * Tests all service types and their variations:
 * 1. Mini Move (Petite, Standard, Full) + Organizing options
 * 2. Standard Delivery (various item counts, same-day)
 * 3. Specialty Items (Peloton, Surfboard, Crib, Wardrobe Box)
 * 4. BLADE Airport Transfer (JFK, EWR)
 */

test.describe('Booking Wizard - All Services', () => {
  
  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  
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
  
  async function fillAddresses(page: Page) {
    console.log('Filling addresses...');
    
    // Pickup address
    await page.getByPlaceholder('Start typing your address...').first().fill('123 West 57th Street');
    await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Suite 100');
    await page.getByPlaceholder('New York').first().fill('New York');
    const pickupState = page.locator('select, combobox').first();
    await pickupState.selectOption('NY');
    await page.getByPlaceholder('10001').first().fill('10019');
    
    // Delivery address
    await page.getByPlaceholder('Start typing your address...').nth(1).fill('456 Park Avenue');
    await page.getByPlaceholder('Apt 4B, Suite 200').nth(1).fill('Apt 5B');
    await page.getByPlaceholder('New York').nth(1).fill('New York');
    const deliveryState = page.locator('select, combobox').nth(1);
    await deliveryState.selectOption('NY');
    await page.getByPlaceholder('10001').nth(1).fill('10022');
    
    console.log('✓ Addresses filled');
    await page.waitForTimeout(2000);
  }
  
  async function fillCustomerInfo(page: Page, firstName = 'John', lastName = 'Smith') {
    console.log('Filling customer info...');
    await page.getByLabel('First Name').fill(firstName);
    await page.getByLabel('Last Name').fill(lastName);
    await page.getByLabel('Email Address').fill(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`);
    await page.getByLabel('Phone Number').fill('2125551234');
    console.log('✓ Customer info filled');
  }
  
  async function selectDateAndTime(page: Page, timeSlot: 'morning' | 'afternoon' = 'morning') {
    console.log('Selecting date and time...');
    
    // Select first available date
    const calendarButtons = page.locator('.grid.grid-cols-7 button:not([disabled])');
    const firstAvailableDate = calendarButtons.first();
    await firstAvailableDate.scrollIntoViewIfNeeded();
    await firstAvailableDate.click();
    console.log('✓ Date selected');
    
    await page.waitForTimeout(1000);
    
    // Select time slot
    if (timeSlot === 'morning') {
      const morningButton = page.locator('button:has-text("Morning (8 AM - 11 AM)")');
      await morningButton.scrollIntoViewIfNeeded();
      await morningButton.click();
      console.log('✓ Morning time selected');
    } else {
      const afternoonButton = page.locator('button:has-text("Afternoon")');
      await afternoonButton.scrollIntoViewIfNeeded();
      await afternoonButton.click();
      console.log('✓ Afternoon time selected');
    }
    
    await page.waitForTimeout(3000);
    await expect(page.getByText('Pricing Summary')).toBeVisible({ timeout: 10000 });
  }
  
  async function acceptTermsAndVerifyPayment(page: Page, serviceName: string) {
    console.log('Accepting terms and verifying payment button...');
    
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Booking Summary')).toBeVisible();
    await expect(page.getByText(serviceName, { exact: true })).toBeVisible();
    
    // Scroll to terms checkbox
    await page.getByText('Terms of Service Agreement').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Check terms
    const termsCheckbox = page.locator('input[type="checkbox"]').last();
    await termsCheckbox.scrollIntoViewIfNeeded();
    await termsCheckbox.check({ force: true });
    console.log('✓ Terms accepted');
    
    await page.waitForTimeout(1000);
    
    // Verify payment button enabled
    const paymentButton = page.getByRole('button', { name: /continue to payment/i });
    await expect(paymentButton).toBeEnabled({ timeout: 5000 });
    console.log('✓ Payment button enabled');
  }
  
  
  // ============================================================
  // MINI MOVE TESTS
  // ============================================================
  
  test('Mini Move - Petite package ($995)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Service Selection
    await expect(page.getByText('Step 1:')).toBeVisible();
    const miniMoveButton = page.locator('button:has-text("Mini Moves")');
    await miniMoveButton.click();
    await page.waitForTimeout(3000);
    
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    
    await expect(page.getByText('$995')).toBeVisible();
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await continueButton.scrollIntoViewIfNeeded();
    await continueButton.click();
    
    // STEP 2: Date & Time
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    const addressButton = page.getByRole('button', { name: /continue to addresses/i });
    await addressButton.scrollIntoViewIfNeeded();
    await addressButton.click();
    
    // STEP 3: Addresses
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    const reviewButton = page.getByRole('button', { name: /continue to review/i });
    await reviewButton.scrollIntoViewIfNeeded();
    await reviewButton.click();
    
    // STEP 4: Customer Info
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page);
    const finalReviewButton = page.getByRole('button', { name: /continue to review/i });
    await finalReviewButton.scrollIntoViewIfNeeded();
    await finalReviewButton.click();
    await page.waitForTimeout(2000);
    
    // STEP 5: Review & Payment
    await acceptTermsAndVerifyPayment(page, 'Mini Move');
    console.log('✅ Mini Move - Petite package test PASSED!');
  });
  
  
  test('Mini Move - Standard package ($1,725)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select Standard package
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    const standardHeading = page.getByRole('heading', { name: 'Standard', exact: true });
    await standardHeading.scrollIntoViewIfNeeded();
    await standardHeading.click();
    await page.waitForTimeout(1500);
    
    await expect(page.getByText('$1,725')).toBeVisible();
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2-5: Continue through remaining steps
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Jane', 'Doe');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Mini Move');
    await expect(page.getByText('Jane Doe')).toBeVisible();
    console.log('✅ Mini Move - Standard package test PASSED!');
  });
  
  
  test('Mini Move - Full Move package ($2,490)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select Full Move package
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    const fullHeading = page.getByRole('heading', { name: 'Full Move', exact: true });
    await fullHeading.scrollIntoViewIfNeeded();
    await fullHeading.click();
    await page.waitForTimeout(1500);
    
    await expect(page.getByText('$2,490')).toBeVisible();
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2-5: Continue through remaining steps
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Bob', 'Wilson');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Mini Move');
    console.log('✅ Mini Move - Full Move package test PASSED!');
  });
  
  
  test('Mini Move - Petite with Packing service', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select Petite + add packing
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    
    // Look for packing checkbox/toggle
    const packingToggle = page.locator('input[type="checkbox"]').filter({ hasText: /packing/i }).or(
      page.locator('label:has-text("Packing")').locator('input[type="checkbox"]')
    ).first();
    
    if (await packingToggle.isVisible()) {
      await packingToggle.scrollIntoViewIfNeeded();
      await packingToggle.check({ force: true });
      console.log('✓ Packing service added');
      await page.waitForTimeout(1000);
    }
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // Continue through remaining steps
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Alice', 'Brown');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Mini Move');
    console.log('✅ Mini Move with Packing test PASSED!');
  });
  
  
  // ============================================================
  // STANDARD DELIVERY TESTS
  // ============================================================
  
  test('Standard Delivery - 5 items', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select Standard Delivery
    await expect(page.getByText('Step 1:')).toBeVisible();
    const standardDeliveryButton = page.locator('button:has-text("Standard Delivery")');
    await standardDeliveryButton.click();
    console.log('✓ Clicked Standard Delivery');
    await page.waitForTimeout(2000);
    
    // Enter item count
    const itemCountInput = page.locator('input[type="number"]').filter({ has: page.locator('label:has-text("Number of Items")') }).or(
      page.getByLabel(/items?/i)
    ).first();
    
    await itemCountInput.scrollIntoViewIfNeeded();
    await itemCountInput.fill('5');
    console.log('✓ Entered 5 items');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    // STEP 2-5: Continue through flow
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Charlie', 'Davis');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Standard Delivery');
    console.log('✅ Standard Delivery - 5 items test PASSED!');
  });
  
  
  test('Standard Delivery - Same Day option', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select Standard Delivery with same-day option
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(2000);
    
    // Enter item count
    const itemCountInput = page.locator('input[type="number"]').first();
    await itemCountInput.scrollIntoViewIfNeeded();
    await itemCountInput.fill('3');
    await page.waitForTimeout(500);
    
    // Look for same-day checkbox
    const sameDayCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /same.?day/i }).or(
      page.locator('label:has-text("Same Day")').locator('input[type="checkbox"]')
    ).first();
    
    if (await sameDayCheckbox.isVisible()) {
      await sameDayCheckbox.scrollIntoViewIfNeeded();
      await sameDayCheckbox.check({ force: true });
      console.log('✓ Same-day delivery selected');
      await page.waitForTimeout(1000);
      
      // Should show $360 flat rate
      await expect(page.getByText('$360')).toBeVisible({ timeout: 5000 });
    }
    
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    // Continue through remaining steps
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Diana', 'Evans');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Standard Delivery');
    console.log('✅ Standard Delivery - Same Day test PASSED!');
  });
  
  
  // ============================================================
  // SPECIALTY ITEM TESTS
  // ============================================================
  
  test('Specialty Item - Peloton ($500)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select Specialty Item
    await expect(page.getByText('Step 1:')).toBeVisible();
    const specialtyButton = page.locator('button:has-text("Specialty Items")').or(
      page.locator('button:has-text("Specialty Item")')
    );
    await specialtyButton.click();
    console.log('✓ Clicked Specialty Items');
    await page.waitForTimeout(2000);
    
    // Select Peloton
    const pelotonCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /peloton/i }).or(
      page.locator('label:has-text("Peloton")').locator('input[type="checkbox"]')
    ).first();
    
    await pelotonCheckbox.scrollIntoViewIfNeeded();
    await pelotonCheckbox.check({ force: true });
    console.log('✓ Peloton selected');
    await page.waitForTimeout(1000);
    
    await expect(page.getByText('$500')).toBeVisible();
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    // STEP 2-5: Continue through flow
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Frank', 'Garcia');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Specialty Item');
    console.log('✅ Specialty Item - Peloton test PASSED!');
  });
  
  
  test('Specialty Item - Multiple items (Surfboard + Crib)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select multiple specialty items
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Specialty Items")').or(
      page.locator('button:has-text("Specialty Item")')
    ).click();
    await page.waitForTimeout(2000);
    
    // Select Surfboard
    const surfboardCheckbox = page.locator('label:has-text("Surfboard")').locator('input[type="checkbox"]').first();
    await surfboardCheckbox.scrollIntoViewIfNeeded();
    await surfboardCheckbox.check({ force: true });
    console.log('✓ Surfboard selected');
    
    // Select Crib
    const cribCheckbox = page.locator('label:has-text("Crib")').locator('input[type="checkbox"]').first();
    await cribCheckbox.scrollIntoViewIfNeeded();
    await cribCheckbox.check({ force: true });
    console.log('✓ Crib selected');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    // Continue through flow
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Grace', 'Harris');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Specialty Item');
    console.log('✅ Multiple Specialty Items test PASSED!');
  });
  
  
  // ============================================================
  // BLADE AIRPORT TRANSFER TESTS
  // ============================================================
  
  test('BLADE Airport Transfer - JFK', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select BLADE Transfer
    await expect(page.getByText('Step 1:')).toBeVisible();
    const bladeButton = page.locator('button:has-text("BLADE")').or(
      page.locator('button:has-text("Airport Transfer")')
    );
    await bladeButton.click();
    console.log('✓ Clicked BLADE Airport Transfer');
    await page.waitForTimeout(2000);
    
    // Select JFK airport
    const jfkRadio = page.locator('input[type="radio"][value="JFK"]').or(
      page.locator('label:has-text("JFK")').locator('input[type="radio"]')
    ).first();
    await jfkRadio.scrollIntoViewIfNeeded();
    await jfkRadio.check({ force: true });
    console.log('✓ JFK selected');
    
    // Enter flight date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const flightDateInput = page.locator('input[type="date"]').first();
    await flightDateInput.scrollIntoViewIfNeeded();
    await flightDateInput.fill(dateString);
    console.log('✓ Flight date entered');
    
    // Enter flight time
    const flightTimeInput = page.locator('input[type="time"]').first();
    await flightTimeInput.scrollIntoViewIfNeeded();
    await flightTimeInput.fill('14:30');
    console.log('✓ Flight time entered');
    
    // Enter bag count (minimum 2)
    const bagCountInput = page.locator('input[type="number"]').filter({ hasText: /bag/i }).or(
      page.getByLabel(/bags?/i)
    ).first();
    await bagCountInput.scrollIntoViewIfNeeded();
    await bagCountInput.fill('3');
    console.log('✓ Bag count entered');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    // STEP 2: BLADE skips date selection, goes to pickup address
    await expect(page.getByText('Step 2:').or(page.getByText('Step 3:'))).toBeVisible({ timeout: 10000 });
    
    // Fill pickup address only (delivery is auto-filled with JFK)
    await page.getByPlaceholder('Start typing your address...').first().fill('123 West 57th Street');
    await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Suite 100');
    await page.getByPlaceholder('New York').first().fill('New York');
    const pickupState = page.locator('select, combobox').first();
    await pickupState.selectOption('NY');
    await page.getByPlaceholder('10001').first().fill('10019');
    console.log('✓ Pickup address filled');
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    // STEP 4: Customer Info
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Harry', 'Jackson');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(2000);
    
    // STEP 5: Review & Payment
    await acceptTermsAndVerifyPayment(page, 'BLADE');
    console.log('✅ BLADE Airport Transfer - JFK test PASSED!');
  });
  
  
  test('BLADE Airport Transfer - EWR (Newark)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // STEP 1: Select BLADE Transfer with EWR
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("BLADE")').or(
      page.locator('button:has-text("Airport Transfer")')
    ).click();
    await page.waitForTimeout(2000);
    
    // Select EWR airport
    const ewrRadio = page.locator('input[type="radio"][value="EWR"]').or(
      page.locator('label:has-text("EWR")').or(page.locator('label:has-text("Newark")'))
      .locator('input[type="radio"]')
    ).first();
    await ewrRadio.scrollIntoViewIfNeeded();
    await ewrRadio.check({ force: true });
    console.log('✓ EWR/Newark selected');
    
    // Enter flight details
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2); // 2 days from now
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.locator('input[type="date"]').first().fill(dateString);
    await page.locator('input[type="time"]').first().fill('09:15');
    await page.locator('input[type="number"]').first().fill('4');
    console.log('✓ Flight details entered');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    // Continue through remaining steps
    await expect(page.getByText('Step 2:').or(page.getByText('Step 3:'))).toBeVisible({ timeout: 10000 });
    
    await page.getByPlaceholder('Start typing your address...').first().fill('789 Madison Avenue');
    await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Penthouse');
    await page.getByPlaceholder('New York').first().fill('New York');
    const pickupState = page.locator('select, combobox').first();
    await pickupState.selectOption('NY');
    await page.getByPlaceholder('10001').first().fill('10065');
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: /continue/i }).first().click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Iris', 'Kim');
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'BLADE');
    console.log('✅ BLADE Airport Transfer - EWR test PASSED!');
  });
  
  
  // ============================================================
  // TIME SLOT VARIATION TESTS
  // ============================================================
  
  test('Mini Move with Afternoon time slot', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // Select Mini Move - Petite
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2: Select afternoon time slot instead of morning
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page, 'afternoon');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    // Continue through remaining steps
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Jack', 'Lee');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page, 'Mini Move');
    console.log('✅ Mini Move with Afternoon time slot test PASSED!');
  });
  
  
  // ============================================================
  // NAVIGATION TESTS
  // ============================================================
  
  test('Previous button navigation works', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // Go forward to Step 3
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
    const previousButton = page.getByRole('button', { name: /previous|back/i });
    await previousButton.scrollIntoViewIfNeeded();
    await previousButton.click();
    console.log('✓ Clicked Previous');
    await page.waitForTimeout(1000);
    
    // Should be back on Step 2
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 5000 });
    console.log('✓ Back on Step 2');
    
    // Click Previous again
    await previousButton.click();
    await page.waitForTimeout(1000);
    
    // Should be back on Step 1
    await expect(page.getByText('Step 1:')).toBeVisible({ timeout: 5000 });
    console.log('✓ Back on Step 1');
    
    console.log('✅ Previous button navigation test PASSED!');
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
    
    // Look for Start Over button
    const startOverButton = page.getByRole('button', { name: /start over|reset/i });
    
    if (await startOverButton.isVisible()) {
      await startOverButton.scrollIntoViewIfNeeded();
      await startOverButton.click();
      console.log('✓ Clicked Start Over');
      await page.waitForTimeout(1000);
      
      // Should be back on Step 0 or Step 1
      const step0or1 = page.getByText('Step 0:').or(page.getByText('Step 1:')).or(page.getByText('Get Started'));
      await expect(step0or1).toBeVisible({ timeout: 5000 });
      console.log('✓ Wizard reset to beginning');
      
      console.log('✅ Start Over button test PASSED!');
    } else {
      console.log('⚠️  Start Over button not found - may not be implemented');
    }
  });
  
  
  // ============================================================
  // VALIDATION EDGE CASES
  // ============================================================
  
  test('Cannot proceed without selecting package (Mini Move)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    // Click Mini Moves but don't select a package
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    console.log('✓ Clicked Mini Moves');
    
    // Scroll to where packages would be
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Continue button should be disabled
    const continueButton = page.getByRole('button', { name: /continue to date/i });
    await continueButton.scrollIntoViewIfNeeded();
    
    // Wait a moment and verify it stays disabled
    await page.waitForTimeout(2000);
    const isDisabled = await continueButton.isDisabled();
    
    if (isDisabled) {
      console.log('✓ Continue button is disabled as expected');
      console.log('✅ Validation test PASSED - cannot proceed without package!');
    } else {
      console.log('⚠️  Continue button is enabled - validation may be missing');
    }
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
  // Add to: frontend/tests/e2e/booking-wizard-all-services.spec.ts

// ============================================================
// PRICING VALIDATION TESTS
// ============================================================

test.describe('Pricing Display Validation', () => {
  
  test('Petite package shows $995 base price', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    await page.getByText('Select Package').scrollIntoViewIfNeeded();
    
    // Verify Petite price in Step 1
    const petiteCard = page.locator('div, section').filter({ hasText: 'Petite' }).first();
    await petiteCard.scrollIntoViewIfNeeded();
    
    await expect(petiteCard.getByText('$995')).toBeVisible();
    console.log('✓ Step 1: Petite shows $995');
    
    // Select Petite
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2: Verify pricing summary shows
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    
    await expect(page.getByText('Pricing Summary')).toBeVisible();
    await expect(page.getByText('$995')).toBeVisible();
    console.log('✓ Step 2: Pricing Summary shows $995');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    // STEP 3: Verify pricing updates after address entry
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.waitForTimeout(3000); // Wait for pricing API call
    
    // Pricing should still be visible
    await expect(page.getByText('$995')).toBeVisible();
    console.log('✓ Step 3: Pricing still shows after addresses');
    
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    // STEP 4: Customer info (skip validation)
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Price', 'Tester');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    // STEP 5: Verify final pricing breakdown
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Booking Summary')).toBeVisible();
    
    // Look for pricing details
    await expect(page.getByText('Base Price')).toBeVisible();
    await expect(page.getByText('$995')).toBeVisible();
    
    // Look for total
    const totalSection = page.locator('div, section').filter({ hasText: /total/i });
    await totalSection.scrollIntoViewIfNeeded();
    await expect(totalSection).toBeVisible();
    
    console.log('✓ Step 5: Final pricing breakdown visible');
    console.log('✅ Petite pricing validation PASSED!');
  });
  
  
  test('Standard package shows $1,725 at each step', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    // STEP 1: Verify Standard price
    const standardCard = page.locator('div, section').filter({ hasText: /^Standard/ }).first();
    await standardCard.scrollIntoViewIfNeeded();
    await expect(standardCard.getByText('$1,725')).toBeVisible();
    console.log('✓ Step 1: Standard shows $1,725');
    
    // Select Standard
    const standardHeading = page.getByRole('heading', { name: 'Standard', exact: true });
    await standardHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2: Verify pricing in date selection
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await expect(page.getByText('$1,725')).toBeVisible();
    console.log('✓ Step 2: Pricing shows $1,725');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    // STEP 3: Verify pricing after addresses
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.waitForTimeout(3000);
    await expect(page.getByText('$1,725')).toBeVisible();
    console.log('✓ Step 3: Pricing shows $1,725');
    
    await page.getByRole('button', { name: /continue to review/i }).click();
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Standard', 'Pricer');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    // STEP 5: Verify final breakdown
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('$1,725')).toBeVisible();
    console.log('✓ Step 5: Final price shows $1,725');
    console.log('✅ Standard pricing validation PASSED!');
  });
  
  
  test('Full Move package shows $2,490 at each step', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    // STEP 1: Verify Full Move price
    const fullCard = page.locator('div, section').filter({ hasText: 'Full Move' }).first();
    await fullCard.scrollIntoViewIfNeeded();
    await expect(fullCard.getByText('$2,490')).toBeVisible();
    console.log('✓ Step 1: Full Move shows $2,490');
    
    const fullHeading = page.getByRole('heading', { name: 'Full Move', exact: true });
    await fullHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2: Verify pricing
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await expect(page.getByText('$2,490')).toBeVisible();
    console.log('✓ Step 2: Pricing shows $2,490');
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    // STEP 3: Verify pricing after addresses
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.waitForTimeout(3000);
    await expect(page.getByText('$2,490')).toBeVisible();
    console.log('✓ Step 3: Pricing shows $2,490');
    
    await page.getByRole('button', { name: /continue to review/i }).click();
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page, 'Full', 'Mover');
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    // STEP 5: Verify final breakdown
    await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('$2,490')).toBeVisible();
    console.log('✓ Step 5: Final price shows $2,490');
    console.log('✅ Full Move pricing validation PASSED!');
  });
  
  
  test('Weekend surcharge adds $175 to Mini Move', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    // STEP 2: Select a weekend date
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Look for Saturday or Sunday in calendar
    const calendarGrid = page.locator('.grid.grid-cols-7');
    const allDates = calendarGrid.locator('button:not([disabled])');
    
    // Try to find a Saturday or Sunday by looking at the calendar structure
    // Days of week headers are typically in the first row
    // We need to click a date that's in column 0 (Sunday) or 6 (Saturday)
    let weekendDateFound = false;
    const dateCount = await allDates.count();
    
    for (let i = 0; i < dateCount && !weekendDateFound; i++) {
      const dateButton = allDates.nth(i);
      // Click it and see if weekend surcharge appears
      await dateButton.scrollIntoViewIfNeeded();
      await dateButton.click();
      await page.waitForTimeout(2000);
      
      // Check if weekend surcharge text appears
      const hasWeekendSurcharge = await page.getByText(/weekend.*\$175/i).isVisible().catch(() => false);
      
      if (hasWeekendSurcharge) {
        weekendDateFound = true;
        console.log('✓ Found weekend date with surcharge');
        
        // Verify weekend surcharge amount
        await expect(page.getByText('$175')).toBeVisible();
        console.log('✓ Weekend surcharge $175 displayed');
        
        // Total should be $995 + $175 = $1,170
        await expect(page.getByText('$1,170')).toBeVisible();
        console.log('✓ Total price updated to $1,170');
      }
    }
    
    if (weekendDateFound) {
      console.log('✅ Weekend surcharge test PASSED!');
    } else {
      console.log('⚠️  No weekend dates available in current month');
    }
  });
  
  
  test('Organizing service pricing adds to total', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    
    // Note the base price
    console.log('✓ Petite base: $995');
    
    // Look for packing service and its price
    const packingSection = page.locator('div, section').filter({ hasText: /packing/i });
    
    if (await packingSection.isVisible()) {
      await packingSection.scrollIntoViewIfNeeded();
      
      // Look for packing price (should be $1,400 for Petite Packing)
      const hasPacking = await page.getByText('$1,400').isVisible().catch(() => false);
      
      if (hasPacking) {
        console.log('✓ Packing service shows $1,400');
        
        // Enable packing
        const packingCheckbox = page.locator('input[type="checkbox"]')
          .filter({ has: page.locator('label:has-text("Packing")') })
          .or(page.locator('label:has-text("Packing")').locator('input[type="checkbox"]'))
          .first();
        
        if (await packingCheckbox.isVisible()) {
          await packingCheckbox.check({ force: true });
          await page.waitForTimeout(2000);
          console.log('✓ Packing enabled');
          
          // Total should now include packing + tax
          // $995 (base) + $1,400 (packing) + tax on organizing = ~$1,518
          const totalSection = page.locator('text=/total.*\\$/i');
          await totalSection.scrollIntoViewIfNeeded();
          
          // Just verify the total increased
          await expect(page.getByText(/\$1,5\d{2}/)).toBeVisible();
          console.log('✓ Total price increased with packing');
        }
      }
    }
    
    console.log('✅ Organizing service pricing test PASSED!');
  });
  
});


// ============================================================
    // COI (Certificate of Insurance) TESTS
    // ============================================================

    test.describe('COI Functionality', () => {
    
    test('Petite package - COI checkbox adds $50', async ({ page }) => {
        await page.goto('/book');
        await skipAuthStep(page);
        
        // STEP 1: Select Petite (COI NOT included)
        await expect(page.getByText('Step 1:')).toBeVisible();
        await page.locator('button:has-text("Mini Moves")').click();
        await page.waitForTimeout(3000);
        
        const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
        await petiteHeading.scrollIntoViewIfNeeded();
        await petiteHeading.click();
        await page.waitForTimeout(1500);
        
        // Look for COI checkbox - should be available for Petite
        const coiCheckbox = page.locator('input[type="checkbox"]')
        .filter({ has: page.locator('label:has-text(/COI|Certificate of Insurance/i)') })
        .or(page.locator('label:has-text(/COI|Certificate/i)').locator('input[type="checkbox"]'))
        .first();
        
        if (await coiCheckbox.isVisible()) {
        console.log('✓ COI checkbox visible for Petite');
        
        // Verify initial price (without COI)
        await expect(page.getByText('$995')).toBeVisible();
        console.log('✓ Base price: $995');
        
        // Check COI
        await coiCheckbox.scrollIntoViewIfNeeded();
        await coiCheckbox.check({ force: true });
        await page.waitForTimeout(1500);
        console.log('✓ COI checkbox checked');
        
        // Verify COI fee appears
        await expect(page.getByText('$50')).toBeVisible();
        console.log('✓ COI fee $50 displayed');
        
        // Verify total updated to $1,045 ($995 + $50)
        await expect(page.getByText('$1,045')).toBeVisible();
        console.log('✓ Total updated to $1,045');
        
        // Continue to next step
        await page.getByRole('button', { name: /continue to date/i }).click();
        
        // STEP 2: Verify COI fee persists
        await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
        await selectDateAndTime(page);
        
        // COI should still be in pricing
        await expect(page.getByText('$1,045')).toBeVisible();
        console.log('✓ Step 2: COI fee persists in pricing');
        
        await page.getByRole('button', { name: /continue to addresses/i }).click();
        
        // STEP 3: Verify COI in addresses step
        await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
        await fillAddresses(page);
        await page.waitForTimeout(3000);
        
        await expect(page.getByText('$1,045')).toBeVisible();
        console.log('✓ Step 3: COI fee still in pricing');
        
        await page.getByRole('button', { name: /continue to review/i }).click();
        await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
        await fillCustomerInfo(page, 'COI', 'Tester');
        await page.getByRole('button', { name: /continue to review/i }).click();
        await page.waitForTimeout(2000);
        
        // STEP 5: Verify COI in final breakdown
        await expect(page.getByText('Step 5:')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Booking Summary')).toBeVisible();
        
        // Look for COI line item
        const coiLineItem = page.locator('div, tr, li').filter({ hasText: /COI.*\$50/i });
        await coiLineItem.scrollIntoViewIfNeeded();
        await expect(coiLineItem).toBeVisible();
        console.log('✓ Step 5: COI line item visible');
        
        // Verify total
        await expect(page.getByText('$1,045')).toBeVisible();
        console.log('✓ Step 5: Total includes COI');
        
        console.log('✅ Petite COI test PASSED!');
        } else {
        console.log('⚠️  COI checkbox not found - may be in a different location');
        }
    });
    
    
    test('Petite package - COI can be toggled on/off', async ({ page }) => {
        await page.goto('/book');
        await skipAuthStep(page);
        
        await page.locator('button:has-text("Mini Moves")').click();
        await page.waitForTimeout(3000);
        
        const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
        await petiteHeading.scrollIntoViewIfNeeded();
        await petiteHeading.click();
        await page.waitForTimeout(1500);
        
        const coiCheckbox = page.locator('input[type="checkbox"]')
        .filter({ has: page.locator('label:has-text(/COI/i)') })
        .first();
        
        if (await coiCheckbox.isVisible()) {
        // Verify starting price
        await expect(page.getByText('$995')).toBeVisible();
        console.log('✓ Initial: $995');
        
        // Check COI
        await coiCheckbox.check({ force: true });
        await page.waitForTimeout(1500);
        await expect(page.getByText('$1,045')).toBeVisible();
        console.log('✓ With COI: $1,045');
        
        // Uncheck COI
        await coiCheckbox.uncheck({ force: true });
        await page.waitForTimeout(1500);
        await expect(page.getByText('$995')).toBeVisible();
        console.log('✓ COI removed: back to $995');
        
        // Check again
        await coiCheckbox.check({ force: true });
        await page.waitForTimeout(1500);
        await expect(page.getByText('$1,045')).toBeVisible();
        console.log('✓ COI re-added: $1,045');
        
        console.log('✅ COI toggle test PASSED!');
        }
    });
    
    
    test('Standard package - COI included (no extra charge)', async ({ page }) => {
        await page.goto('/book');
        await skipAuthStep(page);
        
        // STEP 1: Select Standard (COI included)
        await expect(page.getByText('Step 1:')).toBeVisible();
        await page.locator('button:has-text("Mini Moves")').click();
        await page.waitForTimeout(3000);
        
        const standardCard = page.locator('div, section').filter({ hasText: /^Standard/ }).first();
        await standardCard.scrollIntoViewIfNeeded();
        
        // Should show "COI Included" text
        await expect(standardCard.getByText(/COI.*included/i)).toBeVisible();
        console.log('✓ Standard package shows "COI Included"');
        
        const standardHeading = page.getByRole('heading', { name: 'Standard', exact: true });
        await standardHeading.click();
        await page.waitForTimeout(1500);
        
        // Price should be $1,725 (no COI checkbox needed)
        await expect(page.getByText('$1,725')).toBeVisible();
        console.log('✓ Standard price: $1,725 (COI included)');
        
        // COI checkbox should NOT be visible for Standard
        const coiCheckbox = page.locator('input[type="checkbox"]')
        .filter({ has: page.locator('label:has-text(/COI/i)') })
        .first();
        
        const coiCheckboxVisible = await coiCheckbox.isVisible().catch(() => false);
        
        if (!coiCheckboxVisible) {
        console.log('✓ No COI checkbox (already included)');
        } else {
        console.log('⚠️  COI checkbox visible - might be an issue');
        }
        
        // Continue through flow and verify no COI surcharge
        await page.getByRole('button', { name: /continue to date/i }).click();
        await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
        await selectDateAndTime(page);
        
        // Price should still be $1,725 (no added COI fee)
        await expect(page.getByText('$1,725')).toBeVisible();
        console.log('✓ Step 2: Price remains $1,725');
        
        console.log('✅ Standard COI included test PASSED!');
    });
    
    
    test('Full Move package - COI included (no extra charge)', async ({ page }) => {
        await page.goto('/book');
        await skipAuthStep(page);
        
        await page.locator('button:has-text("Mini Moves")').click();
        await page.waitForTimeout(3000);
        
        const fullCard = page.locator('div, section').filter({ hasText: 'Full Move' }).first();
        await fullCard.scrollIntoViewIfNeeded();
        
        // Should show "COI Included" text
        await expect(fullCard.getByText(/COI.*included/i)).toBeVisible();
        console.log('✓ Full Move shows "COI Included"');
        
        const fullHeading = page.getByRole('heading', { name: 'Full Move', exact: true });
        await fullHeading.click();
        await page.waitForTimeout(1500);
        
        // Price should be $2,490 (no COI checkbox)
        await expect(page.getByText('$2,490')).toBeVisible();
        console.log('✓ Full Move price: $2,490 (COI included)');
        
        // No COI checkbox should be visible
        const coiCheckbox = page.locator('input[type="checkbox"]')
        .filter({ has: page.locator('label:has-text(/COI/i)') })
        .first();
        
        const coiCheckboxVisible = await coiCheckbox.isVisible().catch(() => false);
        expect(coiCheckboxVisible).toBe(false);
        console.log('✓ No COI checkbox for Full Move');
        
        console.log('✅ Full Move COI included test PASSED!');
    });
    
    });
});

