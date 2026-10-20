import React, { createContext, useContext } from 'react';
import { AuthProvider, useAuth, ServerAuthProfile, AuthContextType } from './AuthContext';
import { UIProvider, useUI, AdminTab, AppPersona, ToastMessage, UIContextType } from './UIContext';
import { DataProvider, useData, DataContextType } from './DataContext';
import {
  Salon,
  User,
  Plan,
  Transaction,
  DispatchMessage,
  MessageTemplate,
  SupportTicket,
  AuditLog,
  ActiveSession,
  SystemMetrics,
  SecuritySettings,
  SalonStatus,
  PlanType,
  UserRole,
  CustomerBooking,
  ClientAuthSession,
} from '../types/admin';

export type { AdminTab, AppPersona, ToastMessage, ServerAuthProfile };

export interface AdminContextType
  extends AuthContextType,
    UIContextType,
    DataContextType {}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <DataProvider>
          <AdminCompositeBridge>{children}</AdminCompositeBridge>
        </DataProvider>
      </UIProvider>
    </AuthProvider>
  );
};

const AdminCompositeBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const ui = useUI();
  const data = useData();

  const combinedValue: AdminContextType = {
    ...auth,
    ...ui,
    ...data,
  };

  return <AdminContext.Provider value={combinedValue}>{children}</AdminContext.Provider>;
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export { useAuth, useUI, useData };
