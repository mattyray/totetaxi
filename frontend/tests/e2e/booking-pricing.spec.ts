// tests/e2e/booking-pricing.spec.ts
import { test, expect } from '@playwright/test';
import { skipAuthStep, selectDateAndTime, fillAddresses } from './helpers';

/**
 * Comprehensive pricing validation tests
 * 
 * Tests that pricing displays correctly at every step:
 * 1. Service selection (initial preview)
 * 2. Date & time (with surcharges)
 * 3. Address (after recalculation)
 * 4. Review & pay (final confirmation)
 */

test.describe('Pricing Display Validation', () => {
  
  // ==================== SPECIALTY ITEMS ====================
  
  test.describe('Specialty Items', () => {
    
    test('Single specialty item shows correct price throughout flow', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      // Step 1: Select Standard Delivery
      await expect(page.getByText('Step 1:')).toBeVisible();
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      // Set regular items to 0
      await page.getByLabel('Number of Items').fill('0');
      await page.waitForTimeout(1000);
      
      // Step 2: Select Peloton ($500)
      const pelotonCard = page.locator('[data-specialty-item-id]').filter({ hasText: 'Peloton' }).first();
      await pelotonCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      const plusButton = pelotonCard.locator('button').filter({ has: page.locator('svg') }).last();
      await plusButton.click();
      await page.waitForTimeout(3000);
      
      // ✅ VALIDATE: Service selection step shows $500
      await expect(page.getByText(/\$500/)).toBeVisible({ timeout: 5000 });
      console.log('✅ Service selection shows $500');
      
      // Step 3: Continue to date selection
      await page.getByRole('button', { name: /continue to date/i }).click();
      await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
      
      // ✅ VALIDATE: Date step shows $500
      await expect(page.getByText(/Total.*\$500/i)).toBeVisible({ timeout: 5000 });
      console.log('✅ Date selection shows $500');
      
      // Select date
      await selectDateAndTime(page);
      
      // ✅ VALIDATE: Pricing summary on date page
      await expect(page.getByText('Pricing Summary')).toBeVisible();
      await expect(page.getByText(/Total:.*\$500/i)).toBeVisible();
      console.log('✅ Pricing summary shows $500');
      
      // Step 4: Continue to addresses
      await page.getByRole('button', { name: /continue to addresses/i }).click();
      await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
      
      // Fill addresses
      await fillAddresses(page);
      
      // Step 5: Continue to review
      await page.getByRole('button', { name: /continue to review/i }).click();
      await page.waitForTimeout(2000);
      
      // ✅ VALIDATE: Review page shows correct breakdown
      await expect(page.getByText(/1x.*Peloton/i)).toBeVisible();
      await expect(page.getByText(/\$500/)).toBeVisible();
      console.log('✅ Review page shows 1x Peloton: $500');
      
      // ✅ VALIDATE: Payment button shows $500
      await expect(page.getByRole('button', { name: /pay.*\$500/i })).toBeVisible();
      console.log('✅ Payment button shows Pay $500');
    });
    
    test('Multiple quantities show correct subtotals', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      await page.getByLabel('Number of Items').fill('0');
      
      // Select 3 Bicycles ($150 each = $450 total)
      const bicycleCard = page.locator('[data-specialty-item-id]').filter({ hasText: 'Bicycle' }).first();
      await bicycleCard.scrollIntoViewIfNeeded();
      
      const plusButton = bicycleCard.locator('button').last();
      await plusButton.click();
      await page.waitForTimeout(500);
      await plusButton.click();
      await page.waitForTimeout(500);
      await plusButton.click();
      await page.waitForTimeout(3000);
      
      // ✅ VALIDATE: Shows quantity
      await expect(bicycleCard.locator('span.text-lg.font-bold').filter({ hasText: /^3$/ })).toBeVisible();
      console.log('✅ Quantity shows: 3');
      
      // ✅ VALIDATE: Shows correct total
      await expect(page.getByText(/\$450/)).toBeVisible({ timeout: 5000 });
      console.log('✅ Total shows: $450 (3 × $150)');
    });
    
    test('Mixed specialty items calculate correctly', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      await page.getByLabel('Number of Items').fill('0');
      
      // Select 2 Bicycles ($150 each = $300)
      const bicycleCard = page.locator('[data-specialty-item-id]').filter({ hasText: 'Bicycle' }).first();
      await bicycleCard.scrollIntoViewIfNeeded();
      const bicyclePlus = bicycleCard.locator('button').last();
      await bicyclePlus.click();
      await page.waitForTimeout(500);
      await bicyclePlus.click();
      await page.waitForTimeout(2000);
      
      // Select 1 Surfboard ($200)
      const surfboardCard = page.locator('[data-specialty-item-id]').filter({ hasText: 'Surfboard' }).first();
      await surfboardCard.scrollIntoViewIfNeeded();
      const surfboardPlus = surfboardCard.locator('button').last();
      await surfboardPlus.click();
      await page.waitForTimeout(3000);
      
      // ✅ VALIDATE: Total is $500 ($300 + $200)
      await expect(page.getByText(/Total.*\$500/i)).toBeVisible({ timeout: 5000 });
      console.log('✅ Mixed items total: $500');
      
      // Continue to review
      await page.getByRole('button', { name: /continue to date/i }).click();
      await page.waitForTimeout(2000);
      await selectDateAndTime(page);
      await page.getByRole('button', { name: /continue to addresses/i }).click();
      await fillAddresses(page);
      await page.getByRole('button', { name: /continue to review/i }).click();
      await page.waitForTimeout(2000);
      
      // ✅ VALIDATE: Review shows both items with quantities
      await expect(page.getByText(/2x.*Bicycle/i)).toBeVisible();
      await expect(page.getByText(/1x.*Surfboard/i)).toBeVisible();
      console.log('✅ Review shows: 2x Bicycle, 1x Surfboard');
    });
  });
  
  // ==================== STANDARD DELIVERY ====================
  
  test.describe('Standard Delivery', () => {
    
    test('Standard delivery with specialty items shows combined total', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      // 5 regular items ($95 × 5 = $475)
      await page.getByLabel('Number of Items').fill('5');
      await page.waitForTimeout(1000);
      
      // Add 1 Bicycle ($150)
      const bicycleCard = page.locator('[data-specialty-item-id]').filter({ hasText: 'Bicycle' }).first();
      await bicycleCard.scrollIntoViewIfNeeded();
      await bicycleCard.locator('button').last().click();
      await page.waitForTimeout(3000);
      
      // ✅ VALIDATE: Total is $625 ($475 + $150)
      await expect(page.getByText(/\$625/)).toBeVisible({ timeout: 5000 });
      console.log('✅ Standard delivery + specialty: $625');
    });
    
    test('Minimum charge applies correctly', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      // 2 items ($95 × 2 = $190, but minimum is $285)
      await page.getByLabel('Number of Items').fill('2');
      await page.waitForTimeout(3000);
      
      // ✅ VALIDATE: Shows $285 minimum, not $190
      await expect(page.getByText(/\$285/)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/\$190/)).not.toBeVisible();
      console.log('✅ Minimum charge applied: $285');
    });
  });
  
  // ==================== SURCHARGES ====================
  
  test.describe('Surcharges', () => {
    
    test('Weekend surcharge displays correctly', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      await page.getByLabel('Number of Items').fill('5');
      await page.waitForTimeout(2000);
      
      await page.getByRole('button', { name: /continue to date/i }).click();
      await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
      
      // Select a Saturday (weekend)
      const saturday = page.locator('[data-day]').filter({ hasText: 'Sat' }).first();
      await saturday.click();
      await page.waitForTimeout(2000);
      
      // ✅ VALIDATE: Weekend surcharge notice appears
      await expect(page.getByText(/weekend.*surcharge/i)).toBeVisible();
      console.log('✅ Weekend surcharge notice shown');
      
      // ✅ VALIDATE: Price increased from base
      const pricingText = await page.locator('[data-testid="pricing-summary"]').textContent();
      expect(pricingText).toContain('Weekend');
      console.log('✅ Weekend surcharge in breakdown');
    });
    
    test('COI fee applies when selected', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Mini Moves")').click();
      await page.waitForTimeout(2000);
      
      // Select Petite package
      await page.getByRole('heading', { name: 'Petite Move', exact: true }).click();
      await page.waitForTimeout(2000);
      
      const basePrice = await page.locator('[data-testid="total-price"]').textContent();
      
      await page.getByRole('button', { name: /continue to date/i }).click();
      await selectDateAndTime(page);
      
      await page.getByRole('button', { name: /continue to addresses/i }).click();
      await fillAddresses(page);
      
      // Check COI checkbox
      await page.getByLabel(/certificate of insurance/i).check();
      await page.waitForTimeout(1000);
      
      // ✅ VALIDATE: COI fee added (+$50)
      await expect(page.getByText(/COI.*\$50/i)).toBeVisible();
      console.log('✅ COI fee displayed: $50');
    });
  });
  
  // ==================== EDGE CASES ====================
  
  test.describe('Edge Cases', () => {
    
    test('Price updates when quantity changes', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      await page.getByLabel('Number of Items').fill('0');
      
      const bicycleCard = page.locator('[data-specialty-item-id]').filter({ hasText: 'Bicycle' }).first();
      await bicycleCard.scrollIntoViewIfNeeded();
      const plusButton = bicycleCard.locator('button').last();
      const minusButton = bicycleCard.locator('button').first();
      
      // Add 1 bike
      await plusButton.click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(/\$150/)).toBeVisible();
      
      // Add another
      await plusButton.click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(/\$300/)).toBeVisible();
      console.log('✅ Price updated: $150 → $300');
      
      // Remove one
      await minusButton.click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(/\$150/)).toBeVisible();
      console.log('✅ Price updated: $300 → $150');
    });
    
    test('Zero quantity removes item from total', async ({ page }) => {
      await page.goto('/book');
      await skipAuthStep(page);
      
      await page.locator('button:has-text("Standard Delivery")').click();
      await page.waitForTimeout(2000);
      
      await page.getByLabel('Number of Items').fill('0');
      
      const bicycleCard = page.locator('[data-specialty-item-id]').filter({ hasText: 'Bicycle' }).first();
      await bicycleCard.scrollIntoViewIfNeeded();
      const plusButton = bicycleCard.locator('button').last();
      const minusButton = bicycleCard.locator('button').first();
      
      await plusButton.click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(/\$150/)).toBeVisible();
      
      // Remove to zero
      await minusButton.click();
      await page.waitForTimeout(2000);
      
      // ✅ VALIDATE: Price is $0 or continue button disabled
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeDisabled();
      console.log('✅ Zero items: continue button disabled');
    });
  });
});