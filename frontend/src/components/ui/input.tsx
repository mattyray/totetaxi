// frontend/src/components/ui/input.tsx
import { cn } from '@/utils/cn';
import { InputHTMLAttributes, forwardRef, useState } from 'react';

const inputVariants = {
  variant: {
    default: 'border-gray-300 focus:border-navy-500 focus:ring-navy-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-300 focus:border-green-500 focus:ring-green-500',
  },
  size: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4 py-4 text-lg',
  }
};

const baseStyles = 'block w-full rounded-md shadow-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400 bg-white';

// Utility functions for input masking
const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6,10)}`;
  }
  if (cleaned.length >= 6) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  if (cleaned.length >= 3) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3)}`;
  return cleaned;
};

const formatZipCode = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length > 5) {
    return `${cleaned.slice(0,5)}-${cleaned.slice(5,9)}`;
  }
  return cleaned;
};

const validateEmail = (email: string) => {
  if (!email) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address (e.g., name@example.com)';
  if (email.includes('..')) return 'Email cannot contain consecutive dots';
  if (email.length > 254) return 'Email address is too long';
  return '';
};

const validatePhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
  if (cleaned.length > 11) return 'Phone number is too long';
  return '';
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: keyof typeof inputVariants.variant;
  inputSize?: keyof typeof inputVariants.size;
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  mask?: 'phone' | 'zip';
  realTimeValidation?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  inputSize = 'md',
  label,
  error,
  success,
  helper,
  mask,
  realTimeValidation = false,
  className,
  onChange,
  value,
  type,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [validationError, setValidationError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Apply input masking
    if (mask === 'phone') {
      newValue = formatPhoneNumber(newValue);
    } else if (mask === 'zip') {
      newValue = formatZipCode(newValue);
    }
    
    setInternalValue(newValue);
    
    // Real-time validation
    if (realTimeValidation) {
      let validationErr = '';
      if (type === 'email') {
        validationErr = validateEmail(newValue);
      } else if (mask === 'phone') {
        validationErr = validatePhone(newValue);
      }
      setValidationError(validationErr);
    }
    
    // Create new event with formatted value
    const newEvent = { ...e, target: { ...e.target, value: newValue } };
    onChange?.(newEvent);
  };

  const displayValue = value !== undefined ? value : internalValue;
  const actualVariant = error || validationError ? 'error' : success ? 'success' : variant;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-navy-900">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        value={displayValue}
        onChange={handleChange}
        className={cn(
          baseStyles,
          inputVariants.variant[actualVariant],
          inputVariants.size[inputSize],
          className
        )}
        {...props}
      />
      {(error || validationError) && (
        <p className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error || validationError}
        </p>
      )}
      {success && !error && !validationError && (
        <p className="text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </p>
      )}
      {helper && !error && !validationError && !success && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';