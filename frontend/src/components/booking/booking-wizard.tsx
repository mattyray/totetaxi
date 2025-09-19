'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingWizard } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

export function BookingWizard() {
  const [mounted, setMounted] = useState(false);
  const {
    currentStep,
    nextStep,
    previousStep,
    canProceedToStep,
    resetWizard,
    initializeForUser,
    isGuestMode
  } = useBookingWizard();
  
  const { isAuthenticated, user, logout, clearSessionIfIncognito } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fix hydration issue
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for incognito/fresh sessions
  useEffect(() => {
    if (!mounted) return;
    clearSessionIfIncognito();
  }, [mounted, clearSessionIfIncognito]);

  // Force logout in incognito/new sessions
  useEffect(() => {
    if (!mounted) return;
    
    const forceLogout = searchParams.get('logout') === 'true';
    if (forceLogout) {
      logout();
      router.replace('/book', { scroll: false });
    }
  }, [mounted, searchParams, logout, router]);

  // Initialize booking wizard
  useEffect(() => {
    if (!mounted) return;
    
    if (isAuthenticated && user?.id) {
      initializeForUser(user.id.toString(), false);
      // Skip auth step if already authenticated
      if (currentStep === 0) {
        nextStep();
      }
    }
  }, [mounted, user?.id, isAuthenticated, initializeForUser, currentStep, nextStep]);

  // Reset wizard on explicit reset
  useEffect(() => {
    if (!mounted) return;
    
    const shouldReset = searchParams.get('reset') === 'true';
    
    if (shouldReset) {
      resetWizard();
      router.replace('/book', { scroll: false });
    }
  }, [searchParams, resetWizard, router, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center">
        <div className="text-navy-900">Loading...</div>
      </div>
    );
  }

  const CurrentStepComponent = STEPS.find(step => step.number === currentStep)?.component;

  // Get display steps (skip customer info for authenticated users, hide auth step from progress)
  const getDisplaySteps = () => {
    let steps = STEPS.slice(1); // Remove auth choice step from display
    
    if (!isGuestMode && isAuthenticated) {
      steps = steps.filter(step => step.number !== 4); // Remove customer info step
    }
    
    return steps.map((step, index) => ({
      ...step,
      displayNumber: index + 1,
      actualStep: step.number
    }));
  };

  const displaySteps = getDisplaySteps();
  const maxSteps = isGuestMode ? 5 : 4;

  const handleStartOver = () => {
    logout();
    resetWizard();
    router.replace('/book?reset=true&logout=true', { scroll: false });
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
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-navy-900 mb-2">
            Book Your Luxury Move
          </h1>
          <p className="text-navy-700">
            From Manhattan to the Hamptons with premium care
          </p>
          {isAuthenticated && currentStep > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Logged in as {user?.first_name} {user?.last_name}
            </p>
          )}
        </div>

        {/* Progress Steps - Only show if past auth step */}
        {currentStep > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {displaySteps.map((step, index) => (
                <div key={step.actualStep} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
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
                    ml-2 text-sm font-medium
                    ${currentStep === step.actualStep ? 'text-navy-900' : 'text-navy-600'}
                  `}>
                    {step.title}
                  </span>
                  
                  {index < displaySteps.length - 1 && (
                    <div className={`
                      h-0.5 w-12 mx-4
                      ${currentStep > step.actualStep ? 'bg-green-500' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-serif font-bold text-navy-900">
              {currentStep === 0 ? 'Get Started' : `Step ${getCurrentDisplayStep()}: ${getStepTitle()}`}
            </h2>
          </CardHeader>
          <CardContent>
            {CurrentStepComponent && <CurrentStepComponent />}
          </CardContent>
        </Card>

        {/* Navigation - Only show if past auth step */}
        {currentStep > 0 && (
          <div className="flex justify-between items-center">
            <div>
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={previousStep}
                  className="mr-4"
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
                >
                  Continue →
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}