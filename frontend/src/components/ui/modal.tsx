// frontend/src/components/ui/modal.tsx
'use client';

import { cn } from '@/utils/cn';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, ReactNode } from 'react';

// Easy to change modal styling
const modalVariants = {
  size: {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  },
  position: {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-16',
  }
};

const overlayStyles = 'fixed inset-0 bg-navy-900 bg-opacity-50 transition-opacity';
const panelStyles = 'relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: keyof typeof modalVariants.size;
  position?: keyof typeof modalVariants.position;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  children: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  position = 'center',
  title,
  description,
  showCloseButton = true,
  children,
  className
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className={overlayStyles} />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className={cn(
            'flex min-h-full p-4 text-center',
            modalVariants.position[position]
          )}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={cn(
                panelStyles,
                modalVariants.size[size],
                'w-full',
                className
              )}>
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between p-6 pb-4">
                    <div>
                      {title && (
                        <Dialog.Title className="text-lg font-serif font-medium text-navy-900">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-1 text-sm text-navy-600">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        type="button"
                        className="rounded-md text-navy-400 hover:text-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-500"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={cn(
                  'px-6',
                  (title || showCloseButton) ? 'pb-6' : 'py-6'
                )}>
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}