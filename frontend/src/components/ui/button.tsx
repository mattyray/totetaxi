// frontend/src/components/ui/button.tsx
import { cn } from '@/utils/cn';
import { ButtonHTMLAttributes, forwardRef } from 'react';

// Easy to change - all styling in config objects
const buttonVariants = {
  variant: {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-500',
    secondary: 'bg-gold-500 text-navy-900 hover:bg-gold-600 focus:ring-gold-400',
    outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-50 focus:ring-navy-300',
    ghost: 'text-navy-900 hover:bg-navy-100 focus:ring-navy-300',
  },
  size: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  },
  rounded: {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }
};

// Base styles that rarely change
const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  rounded?: keyof typeof buttonVariants.rounded;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  rounded = 'md',
  className,
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        buttonVariants.rounded[rounded],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';