// frontend/src/components/ui/card.tsx
import { cn } from '@/utils/cn';
import { HTMLAttributes, forwardRef } from 'react';

// Easy to change card styling
const cardVariants = {
  variant: {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg shadow-navy-900/10',
    luxury: 'bg-white border border-gold-200 shadow-xl shadow-navy-900/20',
    ghost: 'bg-transparent border-0',
  },
  padding: {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },
  rounded: {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
  }
};

const baseStyles = 'transition-all duration-200';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants.variant;
  padding?: keyof typeof cardVariants.padding;
  rounded?: keyof typeof cardVariants.rounded;
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        baseStyles,
        cardVariants.variant[variant],
        cardVariants.padding[padding],
        cardVariants.rounded[rounded],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// Subcomponents for structured content
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div ref={ref} className={cn('pb-4 border-b border-gray-100', className)} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div ref={ref} className={cn('py-4', className)} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div ref={ref} className={cn('pt-4 border-t border-gray-100', className)} {...props}>
    {children}
  </div>
));

CardFooter.displayName = 'CardFooter';