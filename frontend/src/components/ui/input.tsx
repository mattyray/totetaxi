import { cn } from '@/utils/cn';
import { InputHTMLAttributes, forwardRef } from 'react';

// Easy to change input styling
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

// Add text-gray-900 for dark, readable text
const baseStyles = 'block w-full rounded-md shadow-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: keyof typeof inputVariants.variant;
  inputSize?: keyof typeof inputVariants.size;
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  inputSize = 'md',
  label,
  error,
  helper,
  className,
  ...props
}, ref) => {
  const actualVariant = error ? 'error' : variant;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-navy-900">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          baseStyles,
          inputVariants.variant[actualVariant],
          inputVariants.size[inputSize],
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';