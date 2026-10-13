/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastContainer } from './components/common/ToastContainer';
import { ShortcutsModal } from './components/common/ShortcutsModal';

import { OverviewView } from './components/views/OverviewView';
import { BusinessesView } from './components/views/BusinessesView';
import { UsersView } from './components/views/UsersView';
import { SubscriptionsView } from './components/views/SubscriptionsView';
import { MessagesView } from './components/views/MessagesView';
import { SupportView } from './components/views/SupportView';
import { OperationsView } from './components/views/OperationsView';
import { SecurityView } from './components/views/SecurityView';
import { SettingsView } from './components/views/SettingsView';
import { SalonSimulatorView } from './components/views/SalonSimulatorView';

const AdminLayout: React.FC = () => {
  const { activeTab } = useAdmin();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'businesses':
        return <BusinessesView />;
      case 'users':
        return <UsersView />;
      case 'subscriptions':
        return <SubscriptionsView />;
      case 'messages':
        return <MessagesView />;
      case 'support':
        return <SupportView />;
      case 'operations':
        return <OperationsView />;
      case 'security':
        return <SecurityView />;
      case 'settings':
        return <SettingsView />;
      case 'simulator':
        return <SalonSimulatorView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Contract */}
        <Header />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950/60">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <CommandPalette />
      <ToastContainer />
      <ShortcutsModal />
    </div>
  );
};

export default function App() {
  return (
    <AdminProvider>
      <AdminLayout />
    </AdminProvider>
  );
}
