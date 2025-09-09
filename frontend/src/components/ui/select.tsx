import { cn } from '@/utils/cn';
import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  placeholder = 'Select an option',
  className,
  ...props
}, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-navy-900">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm transition-colors duration-200',
          'focus:border-navy-500 focus:ring-navy-500 text-gray-900 bg-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      >
        <option value="" className="text-gray-400">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value} className="text-gray-900">
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';