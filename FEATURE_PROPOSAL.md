# ToteTaxi Feature Proposal

**Date:** January 9, 2026
**Prepared for:** Danielle & Team

---

## Overview

We're proposing three new features to improve operations and customer experience. This document explains what each feature does, why we need it, and where it will appear throughout the system.

---

## 1. Discount Codes

### What It Does

Allows customers to enter a promo code during checkout to receive a dollar amount off their booking.

### Why We Need This

**For Testing (Primary Reason):**

Right now, testing the full booking flow on the production website requires actually paying money. We've been using a $1 test mode, but that doesn't test the real pricing logic or the complete customer experience.

With discount codes, we can:
- Create a `TEST100` code that gives 100% off (or any amount)
- Test all four service types (Standard Delivery, Mini Move, Specialty Items, Airport Transfer) end-to-end
- Verify the entire flow works: booking → payment → confirmation email → staff dashboard → Onfleet task → driver assignment
- Let Matt, Danielle, and drivers test without spending real money
- Test in the actual production environment (not just local development)

This is much better than the $1 hack because it tests the real pricing, surcharges, and the complete customer journey.

**For Marketing:**

Once built, we can also use discount codes for:
- Promotions like `SUMMER25` for $25 off
- Partner referral codes (Hampton Jitney, BLADE)
- First-time customer discounts
- Seasonal campaigns
- Influencer partnerships

### Where It Will Appear

| Location | What You'll See |
|----------|-----------------|
| **Checkout page** | Input field to enter code + "Apply" button |
| **Price summary (checkout)** | New line showing "Discount: -$25.00" |
| **Confirmation email** | Discount amount shown in pricing breakdown |
| **Reminder email** | Total reflects the discounted price |
| **Staff booking detail page** | Which code was used and discount amount |
| **Staff booking list** | Indicator if discount was applied |
| **Reports page** | Revenue reporting accounts for discounts |
| **Django Admin** | Create, edit, activate/deactivate codes |

### How It Works

1. Customer enters code like `SUMMER25` at checkout
2. System validates: Is code active? Not expired? Under usage limit?
3. If valid, price updates immediately showing the discount
4. Discount is stored with the booking for records
5. All emails and reports reflect the discounted amount

### Estimated Time

**10-12 hours** (including testing all touchpoints)

---

## 2. Item Description Field

### What It Does

Adds a text field in the booking wizard where customers can describe what they're sending. This is specifically for Standard Delivery bookings.

### Why We Need This

- **Drivers need to know what they're picking up** - "3 large suitcases and 2 boxes" vs showing up blind
- **Staff can better prepare** for pickups and allocate vehicle space
- **Reduces phone calls** - fewer "what am I looking for?" questions
- **Helps with disputes** - record of what customer said they were sending
- **Improves service quality** - everyone knows what to expect

### Where It Will Appear

| Location | What You'll See |
|----------|-----------------|
| **Booking wizard (service step)** | Text area: "Describe your items (e.g., 2 suitcases, 3 boxes)" |
| **Review & pay step** | Description shown in summary before payment |
| **Confirmation email** | Item description included in booking details |
| **Staff booking list** | Quick preview of description in table |
| **Staff booking detail page** | Full description (editable by staff) |
| **Customer dashboard** | Customer can see their booking description |
| **Onfleet (driver app)** | Description appears in task notes for driver |

### How It Works

1. Customer fills out description during booking (optional or required - your choice)
2. Description saves with the booking
3. Shows up everywhere the booking details appear
4. Staff can edit if customer calls to update
5. Automatically pushed to Onfleet so driver sees it

### Estimated Time

**5-6 hours** (including all display locations and Onfleet integration)

---

## 3. MailChimp Integration

### What It Does

Automatically syncs customer email addresses to your MailChimp audience. No manual data entry required.

### Why We Need This

- **Build your email list automatically** - every customer gets added
- **No manual work** - happens in the background
- **Better marketing** - segment customers by booking history
- **Targeted campaigns** - send promos to past customers who haven't booked recently

### When Customers Get Added

| Trigger | What Gets Synced |
|---------|------------------|
| **Account creation + email verification** | Email, first name, last name, phone |
| **Booking completion** | Updates tags (service type used), booking count |

### Where It Appears

**No customer-facing UI** - this happens automatically in the background.

Staff can see sync status in Django Admin if needed, but there's nothing customers interact with.

### How It Works

1. Customer creates account and verifies email → added to MailChimp audience
2. Customer completes a booking → profile updated with tags like "completed_booking", "standard_delivery"
3. If sync fails, it retries automatically
4. All data stays in sync without manual work

### What We Need From You

- MailChimp account credentials (API key)
- Which audience/list to add customers to

### Estimated Time

**3-4 hours**

---

## Summary & Recommendation

| Feature | Time Estimate | Priority | Why |
|---------|---------------|----------|-----|
| **Discount Codes** | 10-12 hours | **HIGH** | Enables proper testing + marketing capability |
| **Item Description** | 5-6 hours | **MEDIUM** | Improves service quality for drivers and staff |
| **MailChimp** | 3-4 hours | **LOW** | Nice-to-have, no urgency |
| **Total** | **18-22 hours** | | |

### Recommended Order

1. **Discount Codes first** - This unblocks testing for the whole team and removes the need for the $1 workaround
2. **Item Description second** - Direct benefit to customers, drivers, and staff
3. **MailChimp third** - Can wait until the other features are done

---

## Questions Before We Start

### Discount Codes
1. **Fixed amounts only, or percentages too?** (Fixed is simpler to start - we can add percentages later)
2. **Any specific codes you want created right away?** (e.g., `TEST100` for testing, `WELCOME25` for new customers)

### Item Description
1. **Required or optional?** Required means better data but adds friction. Optional is easier for customers but some may skip it.

### MailChimp
1. **Do you have an existing MailChimp account?** If so, we just need the API key and audience ID.

---

## Next Steps

Once you approve, we can start with discount codes immediately. That feature alone will make testing much easier for everyone.

Let us know if you have any questions!
