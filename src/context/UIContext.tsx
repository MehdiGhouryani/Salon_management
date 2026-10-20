import React, { createContext, useContext, useState, useCallback } from 'react';

export type AdminTab =
  | 'overview'
  | 'businesses'
  | 'users'
  | 'subscriptions'
  | 'messages'
  | 'support'
  | 'operations'
  | 'security'
  | 'settings'
  | 'simulator';

export type AppPersona = 'salon_website' | 'salon_app' | 'super_admin';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  undoAction?: () => void;
}

export interface UIContextType {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  persona: AppPersona;
  setPersona: (p: AppPersona) => void;
  currentSalonSlug: string;
  setCurrentSalonSlug: (slug: string) => void;
  viewMode: 'admin' | 'customer';
  setViewMode: (mode: 'admin' | 'customer') => void;
  selectedCustomerSalonId: string;
  setSelectedCustomerSalonId: (id: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  simulatorSalonId: string;
  setSimulatorSalonId: (id: string) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  inspectedSalon: any | null;
  setInspectedSalon: (salon: any | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [persona, setPersonaState] = useState<AppPersona>('salon_website');
  const [currentSalonSlug, setCurrentSalonSlug] = useState<string>('gisara');
  const [viewMode, setViewMode] = useState<'admin' | 'customer'>('admin');
  const [selectedCustomerSalonId, setSelectedCustomerSalonId] = useState<string>('sal-001');

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatorSalonId, setSimulatorSalonId] = useState('sal-001');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [inspectedSalon, setInspectedSalon] = useState<any | null>(null);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setPersona = useCallback((p: AppPersona) => {
    setPersonaState(p);
  }, []);

  return (
    <UIContext.Provider
      value={{
        activeTab,
        setActiveTab,
        persona,
        setPersona,
        currentSalonSlug,
        setCurrentSalonSlug,
        viewMode,
        setViewMode,
        selectedCustomerSalonId,
        setSelectedCustomerSalonId,
        commandPaletteOpen,
        setCommandPaletteOpen,
        shortcutsModalOpen,
        setShortcutsModalOpen,
        toasts,
        addToast,
        removeToast,
        searchQuery,
        setSearchQuery,
        simulatorSalonId,
        setSimulatorSalonId,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        inspectedSalon,
        setInspectedSalon,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
