import React, { createContext, useContext, useState } from 'react';
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
  PlanType,
  UserRole,
  CustomerBooking,
} from '../types/admin';
import {
  initialSalons,
  initialUsers,
  initialPlans,
  initialTransactions,
  initialMessages,
  initialTemplates,
  initialTickets,
  initialAuditLogs,
  initialSessions,
  initialMetrics,
  initialSecuritySettings,
} from '../mock/initialData';
import { getIsDemoMode } from '../utils/env';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

export interface DataContextType {
  isDemoMode: boolean;
  salons: Salon[];
  setSalons: React.Dispatch<React.SetStateAction<Salon[]>>;
  approveSalon: (id: string, reason?: string) => Promise<void> | void;
  suspendSalon: (id: string, reason?: string) => Promise<void> | void;
  activateSalon: (id: string, reason?: string) => Promise<void> | void;
  updateSalonPlan: (id: string, plan: PlanType) => void;
  saveSalon: (salon: Salon) => void;
  deleteSalon: (id: string) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  banUser: (id: string, reason?: string) => Promise<void> | void;
  unbanUser: (id: string, reason?: string) => Promise<void> | void;
  updateUserRole: (id: string, role: UserRole) => void;
  toggleUser2FA: (id: string) => void;
  saveUser: (user: User) => void;
  plans: Plan[];
  transactions: Transaction[];
  messages: DispatchMessage[];
  templates: MessageTemplate[];
  retryFailedMessage: (id: string) => void;
  retryAllFailedMessages: () => void;
  sendBroadcastMessage: (salonName: string, text: string) => void;
  updateTemplate: (id: string, pattern: string, enabled: boolean) => void;
  tickets: SupportTicket[];
  replyToTicket: (id: string, message: string) => void;
  resolveTicket: (id: string) => void;
  closeTicket: (id: string) => void;
  sessions: ActiveSession[];
  terminateSession: (id: string) => void;
  terminateAllOtherSessions: () => void;
  metrics: SystemMetrics;
  flushRedisCache: () => void;
  runSystemDiagnostic: () => void;
  auditLogs: AuditLog[];
  securitySettings: SecuritySettings;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  addIpToBlacklist: (ip: string) => void;
  removeIpFromBlacklist: (ip: string) => void;
  customerBookings: CustomerBooking[];
  addCustomerBooking: (booking: CustomerBooking) => void;
  updateCustomerBooking: (id: string, updates: Partial<CustomerBooking>) => void;
  cancelCustomerBooking: (id: string) => void;
  completeCustomerBookingInSalon: (bookingId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemoMode = getIsDemoMode();
  const { serverAuth } = useAuth();
  const { addToast } = useUI();

  const [salons, setSalons] = useState<Salon[]>(initialSalons);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [plans] = useState<Plan[]>(initialPlans);
  const [transactions] = useState<Transaction[]>(initialTransactions);
  const [messages, setMessages] = useState<DispatchMessage[]>(initialMessages);
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [sessions, setSessions] = useState<ActiveSession[]>(initialSessions);
  const [metrics, setMetrics] = useState<SystemMetrics>(initialMetrics);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(initialSecuritySettings);
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);

  // Salon handlers
  const changeSalonStatusApi = async (
    id: string,
    status: 'active' | 'suspended' | 'rejected',
    reason?: string
  ) => {
    if (serverAuth.authenticated) {
      try {
        const res = await fetch(`/api/admin/salons/${id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-NobatAra-Client': 'web',
          },
          body: JSON.stringify({ status, reason }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'خطا در تغییر وضعیت سالن در سرور');
        }
      } catch (e: any) {
        addToast({ type: 'error', title: 'خطای سرور', message: e.message });
        return false;
      }
    }
    return true;
  };

  const approveSalon = async (id: string, reason = 'تایید مدارک صنفی و احراز صلاحیت سالن') => {
    const success = await changeSalonStatusApi(id, 'active', reason);
    if (!success) return;

    setSalons((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'active' } : s))
    );

    const target = salons.find((s) => s.id === id);
    const targetName = target ? target.name : 'سالن';

    addToast({
      type: 'success',
      title: 'سالن تایید شد',
      message: `سالن «${targetName}» با موفقیت تایید و فعال گردید.`,
    });

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: serverAuth.user?.fullName || 'ادمین کل پلتفرم',
        actorRole: 'super_admin',
        action: 'تغییر وضعیت سالن به فعال (تایید)',
        target: targetName,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Web)',
        severity: 'info',
        category: 'business',
        details: reason,
      },
      ...prev,
    ]);
  };

  const suspendSalon = async (id: string, reason = 'تعلیق به دلیل عدم رعایت مقررات پلتفرم') => {
    const success = await changeSalonStatusApi(id, 'suspended', reason);
    if (!success) return;

    setSalons((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'suspended' } : s))
    );

    const target = salons.find((s) => s.id === id);
    const targetName = target ? target.name : 'سالن';

    addToast({
      type: 'warning',
      title: 'سالن معلق شد',
      message: `سالن «${targetName}» معلق شد. دلیل: ${reason}`,
    });

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: serverAuth.user?.fullName || 'ادمین کل پلتفرم',
        actorRole: 'super_admin',
        action: `تعلیق سالن - دلیل: ${reason}`,
        target: targetName,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Web)',
        severity: 'warning',
        category: 'business',
        details: reason,
      },
      ...prev,
    ]);
  };

  const activateSalon = async (id: string, reason = 'رفع تعلیق و فعال‌سازی مجدد') => {
    const success = await changeSalonStatusApi(id, 'active', reason);
    if (!success) return;

    setSalons((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'active' } : s))
    );

    const target = salons.find((s) => s.id === id);
    const targetName = target ? target.name : 'سالن';

    addToast({
      type: 'success',
      title: 'سالن فعال شد',
      message: `سالن «${targetName}» مجدداً فعال گردید.`,
    });
  };

  const updateSalonPlan = (id: string, plan: PlanType) => {
    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, plan } : s)));
    addToast({ type: 'info', title: 'پلن ارتقا یافت', message: 'پلن سالن تغییر کرد.' });
  };

  const saveSalon = (updated: Salon) => {
    setSalons((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      if (exists) {
        return prev.map((s) => (s.id === updated.id ? updated : s));
      }
      return [updated, ...prev];
    });
    addToast({ type: 'success', title: 'اطلاعات ذخیره شد' });
  };

  const deleteSalon = (id: string) => {
    setSalons((prev) => prev.filter((s) => s.id !== id));
    addToast({ type: 'warning', title: 'سالن حذف شد' });
  };

  // User handlers
  const changeUserStatusApi = async (id: string, status: 'active' | 'banned', reason?: string) => {
    if (serverAuth.authenticated) {
      try {
        const res = await fetch(`/api/admin/users/${id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-NobatAra-Client': 'web',
          },
          body: JSON.stringify({ status, reason }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'خطا در تغییر وضعیت کاربر در سرور');
        }
      } catch (e: any) {
        addToast({ type: 'error', title: 'خطای سرور', message: e.message });
        return false;
      }
    }
    return true;
  };

  const banUser = async (id: string, reason = 'مسدودسازی حساب کاربری توسط ادمین') => {
    const success = await changeUserStatusApi(id, 'banned', reason);
    if (!success) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: 'banned' } : u))
    );

    const target = users.find((u) => u.id === id);
    const targetName = target ? target.name : 'کاربر';

    addToast({ type: 'error', title: 'کاربر مسدود شد', message: `حساب «${targetName}» مسدود گردید.` });

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: serverAuth.user?.fullName || 'ادمین کل پلتفرم',
        actorRole: 'super_admin',
        action: `مسدودسازی کاربر - دلیل: ${reason}`,
        target: targetName,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Web)',
        severity: 'critical',
        category: 'privilege',
        details: reason,
      },
      ...prev,
    ]);
  };

  const unbanUser = async (id: string, reason = 'رفع مسدودیت کاربر') => {
    const success = await changeUserStatusApi(id, 'active', reason);
    if (!success) return;

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: 'active' } : u))
    );

    const target = users.find((u) => u.id === id);
    addToast({ type: 'success', title: 'رفع مسدودیت کاربر', message: `حساب «${target?.name || 'کاربر'}» فعال شد.` });
  };

  const updateUserRole = (id: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    addToast({ type: 'info', title: 'تغییر نقش', message: 'نقش کاربر به‌روزرسانی شد.' });
  };

  const toggleUser2FA = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, twoFactorEnabled: !u.twoFactorEnabled } : u))
    );
  };

  const saveUser = (user: User) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.map((u) => (u.id === user.id ? user : u));
      }
      return [user, ...prev];
    });
    addToast({ type: 'success', title: 'کاربر ذخیره شد' });
  };

  // Messages
  const retryFailedMessage = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'delivered' } : m))
    );
    addToast({ type: 'success', title: 'پیام ارسال شد' });
  };

  const retryAllFailedMessages = () => {
    setMessages((prev) =>
      prev.map((m) => (m.status === 'failed' || m.status === 'retrying' ? { ...m, status: 'delivered' } : m))
    );
    addToast({ type: 'success', title: 'تمام پیام‌های ناموفق مجدداً ارسال شدند' });
  };

  const sendBroadcastMessage = (salonName: string, text: string) => {
    const newMsg: DispatchMessage = {
      id: `msg-${Date.now()}`,
      recipientPhone: '09120000000',
      salonName: salonName === 'all' ? 'تمام سالن‌ها' : salonName,
      templateType: 'custom_broadcast',
      text,
      status: 'delivered',
      gateway: 'Kavenegar',
      sentAt: new Date().toISOString(),
      retryCount: 0,
      costRials: 1500,
    };
    setMessages((prev) => [newMsg, ...prev]);
    addToast({ type: 'success', title: 'پیام همگانی ارسال شد' });
  };

  const updateTemplate = (id: string, pattern: string, enabled: boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pattern, enabled } : t))
    );
    addToast({ type: 'info', title: 'قالب پیامک بروزرسانی شد' });
  };

  // Tickets
  const replyToTicket = (id: string, text: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'in_progress',
              messages: [
                ...t.messages,
                {
                  id: `rep-${Date.now()}`,
                  senderName: 'پشتیبانی نوبت‌آرا',
                  senderRole: 'admin',
                  content: text,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : t
      )
    );
    addToast({ type: 'success', title: 'پاسخ ارسال شد' });
  };

  const resolveTicket = (id: string) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'resolved' } : t)));
    addToast({ type: 'success', title: 'تیکت حل شد' });
  };

  const closeTicket = (id: string) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'closed' } : t)));
    addToast({ type: 'info', title: 'تیکت بسته شد' });
  };

  // Sessions
  const terminateSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    addToast({ type: 'warning', title: 'نشست ابطال شد' });
  };

  const terminateAllOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    addToast({ type: 'warning', title: 'تمام نشست‌های دیگر ابطال شدند' });
  };

  // System Ops
  const flushRedisCache = () => {
    addToast({ type: 'success', title: 'کش Redis پاکسازی شد' });
  };

  const runSystemDiagnostic = () => {
    addToast({ type: 'info', title: 'عیب‌یابی سیستم اجرا شد', message: 'سلامت پلتفرم ۱۰۰٪ تایید است.' });
  };

  // Security Settings
  const updateSecuritySettings = (settings: Partial<SecuritySettings>) => {
    setSecuritySettings((prev) => ({ ...prev, ...settings }));
    addToast({ type: 'info', title: 'تنظیمات امنیتی بروزرسانی شد' });
  };

  const addIpToBlacklist = (ip: string) => {
    setSecuritySettings((prev) => ({
      ...prev,
      ipBlacklist: [...new Set([...prev.ipBlacklist, ip])],
    }));
    addToast({ type: 'warning', title: 'IP به لیست سیاه اضافه شد', message: ip });
  };

  const removeIpFromBlacklist = (ip: string) => {
    setSecuritySettings((prev) => ({
      ...prev,
      ipBlacklist: prev.ipBlacklist.filter((item) => item !== ip),
    }));
    addToast({ type: 'info', title: 'IP از لیست سیاه خارج شد', message: ip });
  };

  // Customer Bookings
  const addCustomerBooking = (booking: CustomerBooking) => {
    setCustomerBookings((prev) => [booking, ...prev]);
    addToast({ type: 'success', title: 'نوبت ثبت شد' });
  };

  const updateCustomerBooking = (id: string, updates: Partial<CustomerBooking>) => {
    setCustomerBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    addToast({ type: 'info', title: 'نوبت بروزرسانی شد' });
  };

  const cancelCustomerBooking = (id: string) => {
    setCustomerBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
    );
    addToast({ type: 'warning', title: 'نوبت لغو شد' });
  };

  const completeCustomerBookingInSalon = (bookingId: string) => {
    setCustomerBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b))
    );
    addToast({ type: 'success', title: 'نوبت تکمیل شد' });
  };

  return (
    <DataContext.Provider
      value={{
        isDemoMode,
        salons,
        setSalons,
        approveSalon,
        suspendSalon,
        activateSalon,
        updateSalonPlan,
        saveSalon,
        deleteSalon,
        users,
        setUsers,
        banUser,
        unbanUser,
        updateUserRole,
        toggleUser2FA,
        saveUser,
        plans,
        transactions,
        messages,
        templates,
        retryFailedMessage,
        retryAllFailedMessages,
        sendBroadcastMessage,
        updateTemplate,
        tickets,
        replyToTicket,
        resolveTicket,
        closeTicket,
        sessions,
        terminateSession,
        terminateAllOtherSessions,
        metrics,
        flushRedisCache,
        runSystemDiagnostic,
        auditLogs,
        securitySettings,
        updateSecuritySettings,
        addIpToBlacklist,
        removeIpFromBlacklist,
        customerBookings,
        addCustomerBooking,
        updateCustomerBooking,
        cancelCustomerBooking,
        completeCustomerBookingInSalon,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
