import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';

export function useDiscountCode() {
  const { bookingData, applyDiscountCode, clearDiscountCode } = useBookingWizard();
  const { user, isAuthenticated } = useAuthStore();
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getEmail = () => {
    if (isAuthenticated && user?.email) return user.email;
    return bookingData.customer_info?.email || '';
  };

  const validateCode = async (code: string) => {
    if (!code.trim()) {
      clearDiscountCode();
      setError(null);
      setSuccess(null);
      return;
    }

    const email = getEmail();
    if (!email) {
      setError('Email is required to validate a discount code');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post('/api/public/validate-discount/', {
        code: code.trim(),
        email,
        service_type: bookingData.service_type,
        subtotal_cents: bookingData.pricing_data
          ? Math.round(bookingData.pricing_data.total_price_dollars * 100)
          : 0,
      });

      const data = response.data;

      applyDiscountCode(data.code, {
        code: data.code,
        discount_type: data.discount_type,
        discount_description: data.discount_description,
        discount_amount_dollars: data.discount_amount_dollars,
      });

      setSuccess(`${data.discount_description} discount applied!`);
    } catch (err: any) {
      clearDiscountCode();
      const errorMessage = err.response?.data?.error || 'Invalid discount code';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const removeCode = () => {
    clearDiscountCode();
    setError(null);
    setSuccess(null);
  };

  return {
    validateCode,
    removeCode,
    isValidating,
    error,
    success,
    appliedCode: bookingData.discount_info,
  };
}
