// frontend/tests/e2e/helpers.ts
import { Page, expect } from '@playwright/test';

export async function skipAuthStep(page: Page) {
  await page.waitForLoadState('networkidle');
  const getStartedText = page.getByText('Get Started');
  
  if (await getStartedText.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('On Step 0 - Get Started');
    const guestButton = page.getByRole('button', { name: /guest|continue/i }).first();
    if (await guestButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guestButton.click();
      console.log('Clicked continue as guest');
    }
    await page.waitForTimeout(500);
  }
  
  await page.waitForSelector('text=Step 1:', { timeout: 10000 });
  console.log('Now on Step 1');
}

export async function fillAddresses(page: Page) {
  console.log('Filling addresses...');
  
  await page.getByPlaceholder('Start typing your address...').first().fill('123 West 57th Street');
  await page.getByPlaceholder('Apt 4B, Suite 200').first().fill('Suite 100');
  await page.getByPlaceholder('New York').first().fill('New York');
  const pickupState = page.locator('select').first();
  await pickupState.selectOption('NY');
  await page.getByPlaceholder('10001').first().fill('10019');
  
  await page.getByPlaceholder('Start typing your address...').nth(1).fill('456 Park Avenue');
  await page.getByPlaceholder('Apt 4B, Suite 200').nth(1).fill('Apt 5B');
  await page.getByPlaceholder('New York').nth(1).fill('New York');
  const deliveryState = page.locator('select').nth(1);
  await deliveryState.selectOption('NY');
  await page.getByPlaceholder('10001').nth(1).fill('10022');
  
  console.log('✓ Addresses filled');
  await page.waitForTimeout(3000);
}

export async function fillCustomerInfo(page: Page, firstName = 'John', lastName = 'Smith') {
  console.log('Filling customer info...');
  await page.getByLabel('First Name').fill(firstName);
  await page.getByLabel('Last Name').fill(lastName);
  await page.getByLabel('Email Address').fill(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`);
  await page.getByLabel('Phone Number').fill('2125551234');
  console.log('✓ Customer info filled');
}

// ========== 🔧 FIXED: Select safe date (3+ days in future) ==========
export async function selectDateAndTime(page: Page) {
  console.log('Selecting date and time...');
  
  // ✅ Calculate safe date: 3 days in the future to avoid same-day restriction
  const now = new Date();
  const currentHour = now.getHours();
  
  // If after 6 PM, add extra day to be extra safe
  const daysToAdd = currentHour >= 18 ? 4 : 3;
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysToAdd);
  
  const targetDay = futureDate.getDate();
  const targetMonth = futureDate.getMonth();
  const targetYear = futureDate.getFullYear();
  
  console.log(`Looking for date: ${targetMonth + 1}/${targetDay}/${targetYear} (${daysToAdd} days from now)`);
  
  // ✅ Find and click the specific date in the calendar
  // Try multiple strategies to find the date button
  let dateClicked = false;
  
  // Strategy 1: Find button with exact day number that's enabled
  const allDateButtons = await page.locator('.grid.grid-cols-7 button:not([disabled])').all();
  
  for (const button of allDateButtons) {
    const buttonText = await button.innerText().catch(() => '');
    const dayNumber = parseInt(buttonText.trim());
    
    if (dayNumber === targetDay) {
      // Check if this button is in the current or next month
      await button.scrollIntoViewIfNeeded();
      await button.click();
      dateClicked = true;
      console.log(`✓ Date selected: Day ${targetDay}`);
      break;
    }
  }
  
  // Strategy 2: If date not found in current view, might need to go to next month
  if (!dateClicked) {
    const currentMonth = now.getMonth();
    if (targetMonth > currentMonth || targetYear > now.getFullYear()) {
      console.log('Target date is in next month, clicking Next button...');
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Try again after navigating
      const allDateButtonsNext = await page.locator('.grid.grid-cols-7 button:not([disabled])').all();
      
      for (const button of allDateButtonsNext) {
        const buttonText = await button.innerText().catch(() => '');
        const dayNumber = parseInt(buttonText.trim());
        
        if (dayNumber === targetDay) {
          await button.scrollIntoViewIfNeeded();
          await button.click();
          dateClicked = true;
          console.log(`✓ Date selected: Day ${targetDay} (next month)`);
          break;
        }
      }
    }
  }
  
  // Strategy 3: Fallback - just click a date that's far enough in the future
  if (!dateClicked) {
    console.log('⚠️  Using fallback: selecting 5th available date');
    const availableDates = page.locator('.grid.grid-cols-7 button:not([disabled])');
    const fifthDate = availableDates.nth(4); // 5th date (0-indexed)
    await fifthDate.scrollIntoViewIfNeeded();
    await fifthDate.click();
    console.log('✓ Date selected (fallback)');
  }
  
  await page.waitForTimeout(1000);
  
  // ✅ Select time (if not specialty item which doesn't need time)
  const morningButton = page.locator('button:has-text("Morning (8 AM - 11 AM)")');
  
  if (await morningButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await morningButton.scrollIntoViewIfNeeded();
    await morningButton.click();
    console.log('✓ Morning time selected');
  } else {
    console.log('ℹ️  No time selection needed (specialty item or other service)');
  }
  
  await page.waitForTimeout(3000);
  await expect(page.getByText('Pricing Summary')).toBeVisible({ timeout: 10000 });
}
// ========== END FIXED FUNCTION ==========

export async function acceptTermsAndVerifyPayment(page: Page) {
  console.log('Accepting terms and verifying payment button...');
  
  await expect(page.getByText(/Step (4|5):/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Booking Summary')).toBeVisible();
  
  await page.getByText('Terms of Service Agreement').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  const termsCheckbox = page.locator('input[type="checkbox"]').last();
  await termsCheckbox.scrollIntoViewIfNeeded();
  await termsCheckbox.check({ force: true });
  console.log('✓ Terms accepted');
  
  await page.waitForTimeout(1000);
  
  const paymentButton = page.getByRole('button', { name: /continue to payment/i });
  await expect(paymentButton).toBeEnabled({ timeout: 5000 });
  console.log('✓ Payment button enabled');
}