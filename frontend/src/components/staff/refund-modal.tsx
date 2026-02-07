'use client';
// frontend/src/components/staff/refund-modal.tsx

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Payment, Refund } from '@/types';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  bookingNumber: string;
}

export function RefundModal({ isOpen, onClose, payment, bookingNumber }: RefundModalProps) {
  const queryClient = useQueryClient();
  const maxRefundable = payment.amount_dollars - (payment.total_refunded_dollars || 0);
  const [amount, setAmount] = useState(maxRefundable.toString());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const refundMutation = useMutation({
    mutationFn: async (data: { payment_id: string; amount_cents: number; reason: string }) => {
      const response = await apiClient.post('/api/payments/refunds/process/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'booking'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'bookings'] });
      onClose();
      setAmount(maxRefundable.toString());
      setReason('');
      setError('');
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to process refund');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
      return;
    }

    if (amountNum > maxRefundable) {
      setError(`Amount cannot exceed $${maxRefundable.toFixed(2)} (remaining refundable)`);
      return;
    }

    const amountCents = Math.round(amountNum * 100);

    refundMutation.mutate({
      payment_id: payment.id,
      amount_cents: amountCents,
      reason: reason.trim() || 'No reason provided'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={`Issue Refund - ${bookingNumber}`}
      description={`Payment: $${payment.amount_dollars}${(payment.total_refunded_dollars || 0) > 0 ? ` ($${payment.total_refunded_dollars?.toFixed(2)} already refunded)` : ''} (${payment.status})`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1">
            Refund Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-navy-600">$</span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={maxRefundable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7"
              placeholder="0.00"
              required
            />
          </div>
          <p className="text-xs text-navy-500 mt-1">
            Maximum refundable: ${maxRefundable.toFixed(2)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1">
            Reason for Refund <span className="text-navy-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-navy-500 focus:border-navy-500 text-gray-900"
            placeholder="Enter reason for refund (optional)"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <p className="text-amber-800 text-sm font-medium mb-1">Warning</p>
          <p className="text-amber-700 text-sm">
            This will immediately process a refund through Stripe. This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={refundMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={refundMutation.isPending}
          >
            {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}