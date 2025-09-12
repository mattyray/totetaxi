// frontend/src/hooks/use-click-away.ts
import { useEffect, RefObject } from 'react';

export function useClickAway<T extends HTMLElement>(
  ref: RefObject<T | null>, // 👈 Add | null here
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}