'use client';

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-serif font-bold text-navy-900 mb-2">Payment Cancelled</h1>
        <p className="text-navy-600 mb-6">
          Your payment was not completed. Your booking is still on hold and you can use the payment link
          from your email to try again.
        </p>
        <p className="text-sm text-navy-500">
          If you need a new payment link or have questions, contact us at{' '}
          <a href="mailto:info@totetaxi.com" className="text-navy-700 underline">info@totetaxi.com</a>
          {' '}or call <a href="tel:6315955100" className="text-navy-700 underline">(631) 595-5100</a>.
        </p>
      </div>
    </div>
  );
}
