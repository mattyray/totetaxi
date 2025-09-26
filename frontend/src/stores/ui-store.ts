// frontend/src/stores/ui-store.ts
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  modals: {
    login: boolean;
    register: boolean;
    addressForm: boolean;
    paymentMethod: boolean;
  };
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  secureReset: () => void;
}

// SECURITY: Input sanitization helpers
const sanitizeNotification = (notification: Omit<Notification, 'id'>): Omit<Notification, 'id'> => {
  return {
    type: ['success', 'error', 'warning', 'info'].includes(notification.type) 
      ? notification.type 
      : 'info',
    message: notification.message?.substring(0, 500).trim() || '',
    duration: typeof notification.duration === 'number' 
      ? Math.max(1000, Math.min(notification.duration, 30000)) // 1s to 30s
      : undefined
  };
};

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  // State
  sidebarOpen: false,
  theme: 'light',
  notifications: [],
  modals: {
    login: false,
    register: false,
    addressForm: false,
    paymentMethod: false,
  },

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebar: (open) => set({ sidebarOpen: !!open }),
  
  setTheme: (theme) => {
    // SECURITY: Validate theme value
    const validTheme = ['light', 'dark'].includes(theme) ? theme : 'light';
    set({ theme: validTheme });
  },

  openModal: (modal) => {
    // SECURITY: Validate modal key exists
    const validModals = ['login', 'register', 'addressForm', 'paymentMethod'];
    if (validModals.includes(modal)) {
      set((state) => ({
        modals: { ...state.modals, [modal]: true }
      }));
    }
  },

  closeModal: (modal) => {
    // SECURITY: Validate modal key exists
    const validModals = ['login', 'register', 'addressForm', 'paymentMethod'];
    if (validModals.includes(modal)) {
      set((state) => ({
        modals: { ...state.modals, [modal]: false }
      }));
    }
  },

  addNotification: (notification) => {
    const sanitizedNotification = sanitizeNotification(notification);
    
    set((state) => {
      // SECURITY: Limit total notifications to prevent memory issues
      const maxNotifications = 10;
      const newNotifications = [
        ...state.notifications.slice(-maxNotifications + 1),
        { 
          ...sanitizedNotification, 
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
        }
      ];
      
      return { notifications: newNotifications };
    });
  },

  removeNotification: (id) => {
    // SECURITY: Validate ID format
    const sanitizedId = id?.substring(0, 50);
    if (sanitizedId) {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== sanitizedId)
      }));
    }
  },

  clearNotifications: () => set({ notifications: [] }),

  // SECURITY: Reset method for security incidents
  secureReset: () => {
    console.log('SECURITY: Performing secure reset of UI store');
    set({
      sidebarOpen: false,
      theme: 'light',
      notifications: [],
      modals: {
        login: false,
        register: false,
        addressForm: false,
        paymentMethod: false,
      }
    });
  }
}));