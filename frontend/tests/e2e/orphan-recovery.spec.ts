// frontend/tests/e2e/orphan-recovery.spec.ts
// Frontend coverage for the orphaned-payment cure (INC-004). Rather than driving
// the (finnicky) multi-step wizard, we seed the persisted store directly at the
// Review & Pay step and mock the network, so these assert the exact React code
// paths that changed: booking_payload + cart_key on the PI request, recovery
// error-handling (don't delete the PI), and the store-migrate data-loss fix.
import { test, expect, Page } from '@playwright/test';

const STORE_KEY = 'totetaxi-booking-wizard';
const FUTURE = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

const PRICING = {
  base_price_dollars: 995, same_day_delivery_dollars: 0, surcharge_dollars: 0,
  coi_fee_dollars: 0, organizing_total_dollars: 0, organizing_tax_dollars: 0,
  geographic_surcharge_dollars: 0, time_window_surcharge_dollars: 0,
  total_price_dollars: 995, pre_discount_total_dollars: 995, discount_amount_dollars: 0,
};

function seedState(overrides: Record<string, any> = {}) {
  return {
    bookingData: {
      service_type: 'mini_move',
      mini_move_package_id: '00000000-0000-0000-0000-000000000001',
      package_type: 'petite',
      include_packing: false, include_unpacking: false,
      is_same_day_delivery: false, is_outside_core_area: false, coi_required: false,
      specialty_items: [],
      pickup_date: FUTURE, pickup_time: 'morning',
      pickup_address: { address_line_1: '123 West 57th Street', city: 'New York', state: 'NY', zip_code: '10019' },
      delivery_address: { address_line_1: '456 Park Avenue', city: 'New York', state: 'NY', zip_code: '10022' },
      customer_info: { first_name: 'John', last_name: 'Smith', email: 'john.smith@test.com', phone: '2125551234' },
      pricing_data: PRICING,
    },
    currentStep: 5,
    isBookingComplete: false,
    userId: 'guest',
    isGuestMode: true,
    lastResetTimestamp: Date.now(),
    ...overrides,
  };
}

/** Seed localStorage before the app boots, and stub pricing so the review screen
 *  renders without the recalculating spinner. */
async function seedReview(page: Page, { state = {}, version = 9 }: { state?: Record<string, any>, version?: number } = {}) {
  await page.route('**/api/public/pricing-preview/', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ pricing: PRICING, details: {} }) }));
  await page.route('**/api/public/services/', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ specialty_items: [], mini_move_packages: [], standard_delivery_config: {} }) }));
  await page.addInitScript(([key, payload]) => {
    localStorage.setItem(key as string, payload as string);
  }, [STORE_KEY, JSON.stringify({ state: seedState(state), version })]);
}

async function readStore(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string)?.state, STORE_KEY);
}

test.describe('Orphaned-payment cure — frontend', () => {

  test('create-payment-intent request carries booking_payload + cart_key', async ({ page }) => {
    await seedReview(page);
    await page.goto('/book');

    const payBtn = page.getByRole('button', { name: /continue to payment/i });
    await expect(payBtn).toBeVisible({ timeout: 15000 });

    // accept terms so the pay button activates
    await page.locator('input[type="checkbox"]').last().check({ force: true });

    const reqPromise = page.waitForRequest('**/api/public/create-payment-intent/');
    await page.route('**/api/public/create-payment-intent/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ client_secret: null, payment_intent_id: 'free_order_e2e', amount_dollars: 0 }) }));
    await page.route('**/api/public/guest-booking/', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json',
        body: JSON.stringify({ booking: { booking_number: 'TT-E2E', total_price_dollars: 0, service_type: 'mini_move', status: 'paid' } }) }));

    await payBtn.click();

    const body = (await reqPromise).postDataJSON();
    expect(body.cart_key, 'cart_key must be sent').toBeTruthy();
    expect(body.booking_payload, 'booking_payload must be sent').toBeTruthy();
    expect(body.booking_payload.service_type).toBe('mini_move');
    expect(body.booking_payload.pickup_address?.zip_code).toBe('10019');
    expect(body.booking_payload.delivery_address?.zip_code).toBe('10022');
  });

  test('auto-recovery failure (generic 4xx) keeps the pending PI and reassures', async ({ page }) => {
    await seedReview(page, { state: { pendingPaymentIntentId: 'pi_e2e_recovery', pendingBookingToken: 'tok' } });
    // the mount-recovery POST fails with a generic server error
    await page.route('**/api/public/guest-booking/', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ error: 'temporary server error' }) }));

    await page.goto('/book');

    await expect(page.getByText(/finalizing your booking/i)).toBeVisible({ timeout: 15000 });
    // Critical: the pending PI must NOT be deleted — the backend can still recover it.
    expect((await readStore(page)).pendingPaymentIntentId).toBe('pi_e2e_recovery');
  });

  test('"already used" response clears the PI and shows confirmation', async ({ page }) => {
    await seedReview(page, { state: { pendingPaymentIntentId: 'pi_e2e_used', pendingBookingToken: 'tok' } });
    await page.route('**/api/public/guest-booking/', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ error: 'This payment has already been used for a booking' }) }));

    await page.goto('/book');

    await expect(page.getByText(/already confirmed/i)).toBeVisible({ timeout: 15000 });
    expect((await readStore(page)).pendingPaymentIntentId, 'PI should be cleared once booked').toBeFalsy();
  });

  test('store-version bump preserves booking data while a payment is pending', async ({ page }) => {
    // Old (v8) store with an in-flight payment, loaded by the new (v9) app.
    await seedReview(page, { version: 8, state: { pendingPaymentIntentId: 'pi_e2e_migrate' } });
    // don't let mount-recovery POST hit anything real
    await page.route('**/api/public/guest-booking/', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'noop' }) }));

    await page.goto('/book');
    await page.waitForTimeout(2000);

    const state = await readStore(page);
    // The migrate must NOT wipe bookingData while a payment is pending (old bug:
    // empty recovery POST -> 400 -> PI deleted -> orphan).
    expect(state.pendingPaymentIntentId).toBe('pi_e2e_migrate');
    expect(state.bookingData?.service_type, 'service_type must survive the migrate').toBe('mini_move');
  });

});
