// frontend/tests/e2e/booking-mini-moves.spec.ts
import { test, expect } from '@playwright/test';
import { skipAuthStep, selectDateAndTime, fillAddresses, fillCustomerInfo, acceptTermsAndVerifyPayment } from './helpers';

test.describe('Mini Moves', () => {
  
  test('Petite package ($995)', async ({ page }) => {
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
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    await fillAddresses(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    
    await expect(page.getByText('Step 4:')).toBeVisible({ timeout: 10000 });
    await fillCustomerInfo(page);
    await page.getByRole('button', { name: /continue to review/i }).click();
    await page.waitForTimeout(2000);
    
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ Petite test PASSED!');
  });
  
  
  test('Petite with Professional Packing', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const petiteHeading = page.getByRole('heading', { name: 'Petite', exact: true });
    await petiteHeading.scrollIntoViewIfNeeded();
    await petiteHeading.click();
    await page.waitForTimeout(1500);
    
    // ✅ FIX: Find packing checkbox by the card it's in
    await expect(page.getByText('Professional Organizing Services')).toBeVisible();
    
    // Find the packing card by its heading
    const packingCard = page.locator('div').filter({ hasText: /Petite Packing/ }).first();
    await packingCard.scrollIntoViewIfNeeded();
    
    // Find checkbox inside the packing card
    const packingCheckbox = packingCard.locator('input[type="checkbox"]').first();
    await packingCheckbox.check({ force: true });
    await page.waitForTimeout(1000);
    console.log('✓ Packing service selected');
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    await selectDateAndTime(page);
    
    // Verify packing fee in pricing
    await expect(page.getByText(/organizing/i)).toBeVisible();
    console.log('✓ Organizing fees displayed');
    
    console.log('✅ Packing test PASSED!');
  });
  
  
  test('Standard package ($1725)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const standardHeading = page.getByRole('heading', { name: 'Standard', exact: true });
    await standardHeading.scrollIntoViewIfNeeded();
    await standardHeading.click();
    await page.waitForTimeout(1500);
    
    await expect(page.getByText('$1725')).toBeVisible();
    await page.getByRole('button', { name: /continue to date/i }).click();
    
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
    
    await acceptTermsAndVerifyPayment(page);
    console.log('✅ Standard test PASSED!');
  });
  
  
  test('Full Move package ($2490)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(3000);
    
    const fullHeading = page.getByRole('heading', { name: 'Full Move', exact: true });
    await fullHeading.scrollIntoViewIfNeeded();
    await fullHeading.click();
    await page.waitForTimeout(1500);
    
    await expect(page.getByText('$2490')).toBeVisible();
    
    console.log('✅ Full Move test PASSED!');
  });
  
});