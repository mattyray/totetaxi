// frontend/src/components/booking/booking-wizard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingWizard } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { AuthChoiceStep } from './auth-choice-step';
import { ServiceSelectionStep } from './service-selection-step';
import { DateTimeStep } from './date-time-step';
import { AddressStep } from './address-step';
import { CustomerInfoStep } from './customer-info-step';
import { ReviewPaymentStep } from './review-payment-step';

const STEPS = [
  { number: 0, title: 'Get Started', component: AuthChoiceStep },
  { number: 1, title: 'Select Service', component: ServiceSelectionStep },
  { number: 2, title: 'Date & Time', component: DateTimeStep },
  { number: 3, title: 'Addresses', component: AddressStep },
  { number: 4, title: 'Your Info', component: CustomerInfoStep },
  { number: 5, title: 'Review & Pay', component: ReviewPaymentStep },
];

interface BookingWizardProps {
  onComplete?: () => void;
}

export function BookingWizard({ onComplete }: BookingWizardProps) {
  const [mounted, setMounted] = useState(false);
  const {
    currentStep,
    nextStep,
    previousStep,
    canProceedToStep,
    resetWizard,
    initializeForUser,
    isGuestMode,
    isBookingComplete,
    completedBookingNumber
  } = useBookingWizard();
  
  const { isAuthenticated, user, logout, clearSessionIfIncognito } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isBookingComplete && completedBookingNumber) {
      const timer = setTimeout(() => {
        console.log('Booking complete, closing wizard');
        resetWizard();
        if (onComplete) {
          onComplete();
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isBookingComplete, completedBookingNumber, resetWizard, onComplete]);

  useEffect(() => {
    if (!mounted) return;
    clearSessionIfIncognito();
  }, [mounted, clearSessionIfIncognito]);

  useEffect(() => {
    if (!mounted) return;
    
    if (isBookingComplete && completedBookingNumber) {
      console.log('Success screen active, skipping initialization');
      return;
    }
    
    if (isAuthenticated && user) {
      console.log('Wizard: User authenticated, initializing for user', user.id);
      initializeForUser(user.id.toString(), false);
    } else {
      console.log('Wizard: No user, initializing as guest');
      initializeForUser('guest', true);
    }
  }, [mounted, isAuthenticated, user, initializeForUser, isBookingComplete, completedBookingNumber]);

  // Step 4 skip for authenticated users is handled in the store's
  // nextStep/previousStep — no useEffect needed (L14 fix).

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-navy-900">Loading...</div>
      </div>
    );
  }

  if (isBookingComplete && completedBookingNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-serif font-bold text-navy-900 mb-2">
            Booking Confirmed!
          </h3>
          <p className="text-navy-700 mb-4">
            Your booking {completedBookingNumber} has been created successfully.
          </p>
          <p className="text-sm text-navy-600">
            You'll receive a confirmation email shortly.
          </p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = STEPS.find(step => step.number === currentStep)?.component;

  const getDisplaySteps = () => {
    let steps = STEPS.slice(1);
    
    if (!isGuestMode && isAuthenticated) {
      steps = steps.filter(step => step.number !== 4);
    }
    
    return steps.map((step, index) => ({
      ...step,
      displayNumber: index + 1,
      actualStep: step.number
    }));
  };

  const displaySteps = getDisplaySteps();
  const maxSteps = isGuestMode ? 5 : 4;

  const handleStartOver = async () => {
    await logout();
    resetWizard();
  };

  const getStepTitle = () => {
    const step = STEPS.find(s => s.number === currentStep);
    return step?.title || 'Unknown Step';
  };

  const getCurrentDisplayStep = () => {
    if (currentStep === 0) return 0;
    if (!isGuestMode && currentStep > 4) return currentStep - 1;
    return currentStep;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-navy-900">
              Book Your Luxury Move
            </h1>
            <p className="text-navy-700 mt-1">
              From Manhattan to the Hamptons with premium care
            </p>
            {isAuthenticated && currentStep > 0 && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Logged in as {user?.first_name} {user?.last_name}
              </p>
            )}
          </div>

          {/* Mobile Progress Dots */}
          {currentStep > 0 && (
            <div className="flex items-center justify-center mt-4 md:hidden">
              <div className="flex space-x-2">
                {displaySteps.map((step) => (
                  <div
                    key={step.actualStep}
                    className={`w-3 h-3 rounded-full ${
                      currentStep === step.actualStep 
                        ? 'bg-navy-900' 
                        : currentStep > step.actualStep
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="ml-3 text-sm text-gray-600">
                Step {getCurrentDisplayStep()} of {maxSteps}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Progress Bar */}
      {currentStep > 0 && (
        <div className="hidden md:block bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              {displaySteps.map((step, index) => (
                <div key={step.actualStep} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${currentStep === step.actualStep 
                      ? 'bg-navy-900 text-white' 
                      : currentStep > step.actualStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {currentStep > step.actualStep ? '✓' : step.displayNumber}
                  </div>
                  
                  <span className={`
                    ml-3 text-sm font-medium
                    ${currentStep === step.actualStep ? 'text-navy-900' : 'text-navy-600'}
                  `}>
                    {step.title}
                  </span>
                  
                  {index < displaySteps.length - 1 && (
                    <div className={`
                      h-0.5 w-16 mx-6
                      ${currentStep > step.actualStep ? 'bg-green-500' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - No Card Wrapper */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-navy-900 mb-6">
              {currentStep === 0 ? 'Get Started' : `Step ${getCurrentDisplayStep()}: ${getStepTitle()}`}
            </h2>
            
            {CurrentStepComponent && <CurrentStepComponent />}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Navigation */}
      {currentStep > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {currentStep > 1 && (
                  <Button 
                    variant="outline" 
                    onClick={previousStep}
                  >
                    ← Previous
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  onClick={handleStartOver}
                  className="text-navy-600"
                >
                  Start Over
                </Button>
              </div>
              
              <div>
                {currentStep < maxSteps && canProceedToStep(currentStep + 1) && (
                  <Button 
                    variant="primary" 
                    onClick={nextStep}
                    size="lg"
                  >
                    Continue →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}