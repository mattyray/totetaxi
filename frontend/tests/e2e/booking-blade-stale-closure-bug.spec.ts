// frontend/tests/e2e/booking-blade-stale-closure-bug.spec.ts
import { test, expect } from '@playwright/test';
import { skipAuthStep } from './helpers';

test.describe('BLADE Stale Closure Bug Reproduction', () => {
  
  /**
   * TEST 1: Baseline - Normal flow (control test)
   */
  test('Baseline: Normal BLADE booking should populate delivery_address', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button', { hasText: 'BLADE Airport Transfer' }).click();
    await page.waitForTimeout(2000);
    
    const jfkButton = page.locator('.grid.grid-cols-2 button').filter({ hasText: 'JFK' }).first();
    await jfkButton.click();
    await page.waitForTimeout(1000);
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateString = futureDate.toISOString().split('T')[0];
    
    await page.locator('input[type="date"]').fill(dateString);
    await page.locator('input[type="time"]').fill('14:30');
    await page.getByLabel('Bag Count').fill('2');
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    
    const deliveryAddress = await page.evaluate(() => {
      const storeJson = localStorage.getItem('totetaxi-booking-wizard');
      if (!storeJson) return null;
      const store = JSON.parse(storeJson);
      return store.state?.bookingData?.delivery_address;
    });
    
    console.log('📦 Delivery Address:', JSON.stringify(deliveryAddress, null, 2));
    
    expect(deliveryAddress).toBeDefined();
    expect(deliveryAddress.address_line_1).toContain('JFK');
    expect(deliveryAddress.city).toBe('Jamaica');
    expect(deliveryAddress.state).toBe('NY');
    expect(deliveryAddress.zip_code).toBe('11430');
    
    console.log('✅ Baseline test PASSED');
  });
  
  
  /**
   * TEST 2: BUG REPRODUCTION - Rapid airport switching
   * This should FAIL before fix, PASS after fix
   */
  test('BUG REPRODUCTION: Rapid airport switching should keep delivery_address in sync', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button', { hasText: 'BLADE Airport Transfer' }).click();
    await page.waitForTimeout(1000);
    
    const jfkButton = page.locator('.grid.grid-cols-2 button').filter({ hasText: 'JFK' }).first();
    const ewrButton = page.locator('.grid.grid-cols-2 button').filter({ hasText: 'EWR' }).first();
    
    console.log('⚡ Starting rapid airport switching (10 cycles)...');
    for (let i = 0; i < 10; i++) {
      await jfkButton.click();
      await page.waitForTimeout(50);
      await ewrButton.click();
      await page.waitForTimeout(50);
    }
    
    // Final: JFK
    await jfkButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Final selection: JFK');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    await page.locator('input[type="date"]').fill(futureDate.toISOString().split('T')[0]);
    await page.locator('input[type="time"]').fill('14:30');
    await page.getByLabel('Bag Count').fill('2');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    
    const deliveryAddress = await page.evaluate(() => {
      const storeJson = localStorage.getItem('totetaxi-booking-wizard');
      if (!storeJson) return null;
      const store = JSON.parse(storeJson);
      return store.state?.bookingData?.delivery_address;
    });
    
    console.log('📦 After rapid switching:', JSON.stringify(deliveryAddress, null, 2));
    
    // CRITICAL: This should FAIL before fix, PASS after fix
    expect(deliveryAddress).toBeDefined();
    expect(deliveryAddress.address_line_1).toContain('JFK');
    expect(deliveryAddress.city).toBe('Jamaica');
    expect(deliveryAddress.state).toBe('NY');
    expect(deliveryAddress.zip_code).toBe('11430');
    
    console.log('✅ Rapid switching test PASSED');
  });
  
  
  /**
   * TEST 3: Nov 21 Scenario - Service type switching + airport changes
   */
  test('NOV 21 SCENARIO: Switching service types then selecting BLADE', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    
    console.log('📝 Simulating user exploring services...');
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("Standard Delivery")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("BLADE Airport Transfer")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("Mini Moves")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("BLADE Airport Transfer")').click();
    await page.waitForTimeout(1000);
    console.log('✓ Final: BLADE Transfer');
    
    const jfkButton = page.locator('.grid.grid-cols-2 button').filter({ hasText: 'JFK' }).first();
    const ewrButton = page.locator('.grid.grid-cols-2 button').filter({ hasText: 'EWR' }).first();
    
    await ewrButton.click();
    await page.waitForTimeout(300);
    await jfkButton.click();
    await page.waitForTimeout(300);
    await ewrButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Final: EWR');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    await page.locator('input[type="date"]').fill(futureDate.toISOString().split('T')[0]);
    await page.locator('input[type="time"]').fill('14:30');
    await page.getByLabel('Bag Count').fill('3');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    
    const deliveryAddress = await page.evaluate(() => {
      const storeJson = localStorage.getItem('totetaxi-booking-wizard');
      if (!storeJson) return null;
      const store = JSON.parse(storeJson);
      return store.state?.bookingData?.delivery_address;
    });
    
    console.log('📦 Nov 21 scenario:', JSON.stringify(deliveryAddress, null, 2));
    
    expect(deliveryAddress).toBeDefined();
    expect(deliveryAddress.address_line_1).toContain('Newark');
    expect(deliveryAddress.city).toBe('Newark');
    expect(deliveryAddress.state).toBe('NJ');
    expect(deliveryAddress.zip_code).toBe('07114');
    
    console.log('✅ Nov 21 scenario PASSED');
  });
  
  
  /**
   * TEST 4: STRESS TEST - Extreme rapid changes to trigger race condition
   */
  test('STRESS TEST: Extreme rapid changes (100 cycles)', async ({ page }) => {
    await page.goto('/book');
    await skipAuthStep(page);
    
    await expect(page.getByText('Step 1:')).toBeVisible();
    await page.locator('button', { hasText: 'BLADE Airport Transfer' }).click();
    await page.waitForTimeout(500);
    
    const jfkButton = page.locator('.grid.grid-cols-2 button').filter({ hasText: 'JFK' }).first();
    const ewrButton = page.locator('.grid.grid-cols-2 button').filter({ hasText: 'EWR' }).first();
    
    console.log('⚡ STRESS TEST: 100 rapid cycles with NO delays...');
    
    // Even more extreme - no delays at all between clicks
    for (let i = 0; i < 100; i++) {
      await jfkButton.click();
      await ewrButton.click();
    }
    
    // Final: JFK
    await jfkButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ 100 cycles complete, final: JFK');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    await page.locator('input[type="date"]').fill(futureDate.toISOString().split('T')[0]);
    await page.locator('input[type="time"]').fill('14:30');
    await page.getByLabel('Bag Count').fill('2');
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue to date/i }).click();
    await expect(page.getByText('Step 2:')).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: /continue to addresses/i }).click();
    await expect(page.getByText('Step 3:')).toBeVisible({ timeout: 10000 });
    
    const deliveryAddress = await page.evaluate(() => {
      const storeJson = localStorage.getItem('totetaxi-booking-wizard');
      if (!storeJson) return null;
      const store = JSON.parse(storeJson);
      return store.state?.bookingData?.delivery_address;
    });
    
    console.log('📦 After 100 cycles:', JSON.stringify(deliveryAddress, null, 2));
    
    expect(deliveryAddress).toBeDefined();
    expect(deliveryAddress.address_line_1).toContain('JFK');
    expect(deliveryAddress.city).toBe('Jamaica');
    expect(deliveryAddress.state).toBe('NY');
    expect(deliveryAddress.zip_code).toBe('11430');
    
    console.log('✅ Stress test survived 100 cycles!');
  });
});