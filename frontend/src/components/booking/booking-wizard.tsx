'use client';

import { useBookingWizard } from '@/stores/booking-store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceSelectionStep } from './service-selection-step';
import { DateTimeStep } from './date-time-step';
import { AddressStep } from './address-step';
import { CustomerInfoStep } from './customer-info-step';
import { ReviewPaymentStep } from './review-payment-step';

const STEPS = [
  { number: 1, title: 'Select Service', component: ServiceSelectionStep },
  { number: 2, title: 'Date & Time', component: DateTimeStep },
  { number: 3, title: 'Addresses', component: AddressStep },
  { number: 4, title: 'Your Info', component: CustomerInfoStep },
  { number: 5, title: 'Review & Pay', component: ReviewPaymentStep },
];

export function BookingWizard() {
  const {
    currentStep,
    nextStep,
    previousStep,
    canProceedToStep,
    resetWizard
  } = useBookingWizard();

  const CurrentStepComponent = STEPS.find(step => step.number === currentStep)?.component;

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
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex items-center">
                {/* Step Circle */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step.number 
                    ? 'bg-navy-900 text-white' 
                    : currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : canProceedToStep(step.number)
                    ? 'bg-navy-200 text-navy-900 cursor-pointer hover:bg-navy-300'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {currentStep > step.number ? '✓' : step.number}
                </div>
                
                {/* Step Title */}
                <span className={`
                  ml-2 text-sm font-medium
                  ${currentStep === step.number ? 'text-navy-900' : 'text-navy-600'}
                `}>
                  {step.title}
                </span>
                
                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className={`
                    h-0.5 w-12 mx-4
                    ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-serif font-bold text-navy-900">
              Step {currentStep}: {STEPS.find(s => s.number === currentStep)?.title}
            </h2>
          </CardHeader>
          <CardContent>
            {CurrentStepComponent && <CurrentStepComponent />}
          </CardContent>
        </Card>

        {/* Navigation */}
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
              onClick={resetWizard}
              className="text-navy-600"
            >
              Start Over
            </Button>
          </div>
          
          <div>
            {currentStep < 5 && canProceedToStep(currentStep + 1) && (
              <Button 
                variant="primary" 
                onClick={nextStep}
              >
                Continue →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}