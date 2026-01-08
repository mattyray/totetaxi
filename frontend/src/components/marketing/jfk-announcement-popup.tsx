'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface JFKAnnouncementPopupProps {
  onBookAirportTransfer: () => void;
}

export function JFKAnnouncementPopup({ onBookAirportTransfer }: JFKAnnouncementPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already seen the popup
    const hasSeenPopup = localStorage.getItem('jfk_announcement_seen');

    if (!hasSeenPopup) {
      // Small delay before showing popup for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('jfk_announcement_seen', 'true');
    setIsOpen(false);
  };

  const handleBookNow = () => {
    localStorage.setItem('jfk_announcement_seen', 'true');
    setIsOpen(false);
    onBookAirportTransfer();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      showCloseButton={true}
    >
      <div className="p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-navy-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">
            Introducing Our New JFK Route!
          </h2>
        </div>

        <p className="text-navy-700 mb-6 leading-relaxed">
          Traveling to or from JFK just got a whole lot easier. Tote Taxi now offers
          seamless luggage delivery right to your hotel or straight to your terminal.
          Enjoy a stress-free journey with your luggage already waiting for you at your destination.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleBookNow}
          >
            Book Now
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleClose}
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
