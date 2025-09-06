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
}

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
  setSidebar: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),

  openModal: (modal) => set((state) => ({
    modals: { ...state.modals, [modal]: true }
  })),

  closeModal: (modal) => set((state) => ({
    modals: { ...state.modals, [modal]: false }
  })),

  addNotification: (notification) => set((state) => ({
    notifications: [
      ...state.notifications,
      { ...notification, id: Math.random().toString(36).substr(2, 9) }
    ]
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  clearNotifications: () => set({ notifications: [] })
}));