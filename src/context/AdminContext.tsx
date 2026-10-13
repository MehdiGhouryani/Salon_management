import React, { createContext, useContext, useState, useEffect } from 'react';
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

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  undoAction?: () => void;
}

export type AppPersona = 'salon_website' | 'salon_app' | 'super_admin';

export interface AdminContextType {
  // Existing Tab Navigation for Super Admin
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  // Salons CRUD
  salons: Salon[];
  setSalons: React.Dispatch<React.SetStateAction<Salon[]>>;
  approveSalon: (id: string) => void;
  suspendSalon: (id: string) => void;
  activateSalon: (id: string) => void;
  updateSalonPlan: (id: string, plan: PlanType) => void;
  saveSalon: (salon: Salon) => void;
  deleteSalon: (id: string) => void;
  // Users CRUD & RBAC
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  banUser: (id: string) => void;
  unbanUser: (id: string) => void;
  updateUserRole: (id: string, role: UserRole) => void;
  toggleUser2FA: (id: string) => void;
  saveUser: (user: User) => void;
  // Subscriptions & Plans
  plans: Plan[];
  transactions: Transaction[];
  // Messages & Dispatch
  messages: DispatchMessage[];
  templates: MessageTemplate[];
  retryFailedMessage: (id: string) => void;
  retryAllFailedMessages: () => void;
  sendBroadcastMessage: (salonName: string, text: string) => void;
  updateTemplate: (id: string, pattern: string, enabled: boolean) => void;
  // Support Tickets
  tickets: SupportTicket[];
  replyToTicket: (id: string, message: string) => void;
  resolveTicket: (id: string) => void;
  closeTicket: (id: string) => void;
  // Active Sessions
  sessions: ActiveSession[];
  terminateSession: (id: string) => void;
  terminateAllOtherSessions: () => void;
  // System Metrics & Ops
  metrics: SystemMetrics;
  flushRedisCache: () => void;
  runSystemDiagnostic: () => void;
  // Security & Audit
  auditLogs: AuditLog[];
  securitySettings: SecuritySettings;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  addIpToBlacklist: (ip: string) => void;
  removeIpFromBlacklist: (ip: string) => void;
  // Inspection & Drawer
  inspectedSalon: Salon | null;
  setInspectedSalon: (salon: Salon | null) => void;
  // Modals & Palettes
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;
  // Toast Notifications
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  // Global search & filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Companion Simulator
  simulatorSalonId: string;
  setSimulatorSalonId: (id: string) => void;
  // Three Architecture Personas
  persona: AppPersona;
  setPersona: (p: AppPersona) => void;
  currentSalonSlug: string;
  setCurrentSalonSlug: (slug: string) => void;
  clientSession: ClientAuthSession;
  setClientSession: (session: ClientAuthSession) => void;
  logoutClientSession: () => void;
  // Legacy alias for compatibility
  viewMode: 'admin' | 'customer';
  setViewMode: (mode: 'admin' | 'customer') => void;
  selectedCustomerSalonId: string;
  setSelectedCustomerSalonId: (id: string) => void;
  customerBookings: CustomerBooking[];
  addCustomerBooking: (booking: CustomerBooking) => void;
  cancelCustomerBooking: (id: string) => void;
  completeCustomerBookingInSalon: (bookingId: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setPersonaState] = useState<AppPersona>('salon_website');
  const [currentSalonSlug, setCurrentSalonSlug] = useState<string>('gisara');
  const [clientSession, setClientSession] = useState<ClientAuthSession>({
    isLoggedIn: false,
    phone: '',
    name: '',
  });

  const setPersona = (p: AppPersona) => {
    setPersonaState(p);
  };

  const setViewMode = (mode: 'admin' | 'customer') => {
    if (mode === 'customer') {
      setPersonaState('salon_website');
    } else {
      setPersonaState('super_admin');
    }
  };

  const viewMode: 'admin' | 'customer' = persona === 'super_admin' ? 'admin' : 'customer';

  const [selectedCustomerSalonId, setSelectedCustomerSalonId] = useState<string>('sal-101');
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([
    {
      id: 'cb-1',
      trackingCode: 'ARA-8921',
      salonId: 'sal-101',
      salonName: 'سالن زیبایی و عروس گیس‌آرا',
      clientName: 'سارا تهرانی',
      clientPhone: '09121112233',
      serviceName: 'رنگ و هایلایت تخصصی مو',
      serviceCategory: 'خدمات تخصصی مو',
      staffName: 'ندا سلطانی',
      date: 'فردا ۲۴ آبان',
      time: '۱۰:۳۰',
      price: 2400000,
      paymentMethod: 'in_person',
      createdAt: 'امروز',
      status: 'confirmed',
    },
    {
      id: 'cb-2',
      trackingCode: 'RES-8922',
      salonId: 'sal-102',
      salonName: 'مرکز تخصصی مراقبت پوست و مو کژال',
      clientName: 'مهناز شریفی',
      clientPhone: '09354445566',
      serviceName: 'فیشیال و پاکسازی عمیق پوست',
      serviceCategory: 'مراقبت پوست و فیشیال',
      staffName: 'دکتر الناز صبوری',
      date: 'پنج‌شنبه ۲۶ آبان',
      time: '۱۵:۰۰',
      price: 950000,
      paymentMethod: 'in_person',
      createdAt: 'دیروز',
      status: 'confirmed',
    },
  ]);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [salons, setSalons] = useState<Salon[]>(initialSalons);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [messages, setMessages] = useState<DispatchMessage[]>(initialMessages);
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [sessions, setSessions] = useState<ActiveSession[]>(initialSessions);
  const [metrics, setMetrics] = useState<SystemMetrics>(initialMetrics);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(initialSecuritySettings);

  const [inspectedSalon, setInspectedSalon] = useState<Salon | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatorSalonId, setSimulatorSalonId] = useState<string>('sal-101');

  // Fast keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ignore single-key shortcuts if typing in an input
      if (isInput) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Number keys 1-9 & 0 for ultra-fast tab switching
      const tabMap: Record<string, AdminTab> = {
        '1': 'overview',
        '2': 'businesses',
        '3': 'users',
        '4': 'subscriptions',
        '5': 'messages',
        '6': 'support',
        '7': 'operations',
        '8': 'security',
        '9': 'settings',
        '0': 'simulator',
      };

      if (tabMap[e.key]) {
        e.preventDefault();
        setActiveTab(tabMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const logAction = (
    action: string,
    target: string,
    details: string,
    severity: AuditLog['severity'] = 'info',
    category: AuditLog['category'] = 'business'
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: 'هم‌اکنون',
      actor: 'مهدی غوریانی',
      actorRole: 'super_admin',
      action,
      target,
      ipAddress: '185.120.24.12',
      userAgent: 'Chrome 130 / macOS Sequoia',
      severity,
      category,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Salon handlers
  const approveSalon = (id: string) => {
    const prevSalons = [...salons];
    const target = salons.find((s) => s.id === id);
    if (!target) return;

    setSalons((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'active' as SalonStatus, verifiedBadge: true } : s))
    );
    logAction('تایید و فعال‌سازی سالن', target.name, `وضعیت به فعال و دارای نشان تایید تغییر یافت`, 'info', 'business');
    addToast({
      type: 'success',
      title: 'سالن با موفقیت تایید و فعال شد',
      message: `سالن «${target.name}» به حالت فعال و دارای نشان رسمی تغییر یافت.`,
      undoAction: () => setSalons(prevSalons),
    });
  };

  const suspendSalon = (id: string, reason = 'نقض قوانین سرویس') => {
    const prevSalons = [...salons];
    const target = salons.find((s) => s.id === id);
    if (!target) return;

    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'suspended' as SalonStatus } : s)));
    logAction('تعلیق سالن', target.name, `علت: ${reason}`, 'warning', 'business');
    addToast({
      type: 'warning',
      title: 'سالن معلق شد',
      message: `دسترسی سالن «${target.name}» موقتاً مسدود گردید.`,
      undoAction: () => setSalons(prevSalons),
    });
  };

  const activateSalon = (id: string) => {
    const target = salons.find((s) => s.id === id);
    if (!target) return;
    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'active' as SalonStatus } : s)));
    logAction('رفع تعلیق سالن', target.name, 'حساب سالن مجدداً فعال گردید', 'info', 'business');
    addToast({
      type: 'success',
      title: 'سالن مجدداً فعال شد',
      message: `سالن «${target.name}» از حالت تعلیق خارج شد.`,
    });
  };

  const updateSalonPlan = (id: string, plan: PlanType) => {
    const target = salons.find((s) => s.id === id);
    if (!target) return;
    setSalons((prev) => prev.map((s) => (s.id === id ? { ...s, plan } : s)));
    logAction('تغییر پلن اشتراک سالن', target.name, `پلن جدید: ${plan}`, 'info', 'financial');
    addToast({
      type: 'info',
      title: 'پلن اشتراک بروزرسانی شد',
      message: `پلن سالن «${target.name}» به ${plan} تغییر یافت.`,
    });
  };

  const saveSalon = (updated: Salon) => {
    const exists = salons.some((s) => s.id === updated.id);
    if (exists) {
      setSalons((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      logAction('ویرایش اطلاعات سالن', updated.name, 'بروزرسانی مشخصات و تنظیمات سالن', 'info', 'business');
      addToast({
        type: 'success',
        title: 'اطلاعات سالن ذخیره شد',
        message: updated.name,
      });
    } else {
      setSalons((prev) => [updated, ...prev]);
      logAction('ثبت سالن جدید', updated.name, 'سالن جدید به سامانه اضافه گردید', 'info', 'business');
      addToast({
        type: 'success',
        title: 'سالن جدید افزوده شد',
        message: updated.name,
      });
    }
  };

  const deleteSalon = (id: string) => {
    const target = salons.find((s) => s.id === id);
    if (!target) return;
    setSalons((prev) => prev.filter((s) => s.id !== id));
    logAction('حذف سالن از سیستم', target.name, 'حذف کامل داده‌های سالن', 'critical', 'business');
    addToast({
      type: 'error',
      title: 'سالن حذف شد',
      message: `سالن «${target.name}» به طور کامل پاک شد.`,
    });
  };

  // User handlers
  const banUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'banned' } : u)));
    logAction('مسدودسازی کاربر', target.name, `کاربر ${target.email} مسدود شد`, 'warning', 'privilege');
    addToast({
      type: 'warning',
      title: 'کاربر مسدود شد',
      message: `دسترسی ${target.name} قطع شد.`,
    });
  };

  const unbanUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'active' } : u)));
    logAction('رفع مسدودیت کاربر', target.name, `کاربر ${target.email} فعال شد`, 'info', 'privilege');
    addToast({
      type: 'success',
      title: 'کاربر رفع مسدودیت شد',
      message: `کاربر ${target.name} مجدداً فعال شد.`,
    });
  };

  const updateUserRole = (id: string, role: UserRole) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    logAction('تغییر سطح دسترسی کاربر', target.name, `نقش جدید: ${role}`, 'warning', 'privilege');
    addToast({
      type: 'info',
      title: 'سطح دسترسی کاربر تغییر یافت',
      message: `${target.name} اکنون دارای نقش ${role} است.`,
    });
  };

  const toggleUser2FA = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const newState = !target.twoFactorEnabled;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, twoFactorEnabled: newState } : u)));
    logAction(
      newState ? 'فعالسازی 2FA برای کاربر' : 'غیرفعالسازی 2FA برای کاربر',
      target.name,
      `وضعیت احراز هویت دو مرحله‌ای تغییر یافت`,
      'info',
      'auth'
    );
    addToast({
      type: 'info',
      title: `احراز هویت دومرحله‌ای ${newState ? 'فعال' : 'غیرفعال'} شد`,
      message: target.name,
    });
  };

  const saveUser = (user: User) => {
    const exists = users.some((u) => u.id === user.id);
    if (exists) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      addToast({ type: 'success', title: 'کاربر ویرایش شد', message: user.name });
    } else {
      setUsers((prev) => [user, ...prev]);
      addToast({ type: 'success', title: 'کاربر جدید اضافه شد', message: user.name });
    }
  };

  // Dispatch & Message handlers
  const retryFailedMessage = (id: string) => {
    const target = messages.find((m) => m.id === id);
    if (!target) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: 'delivered',
              sentAt: 'هم‌اکنون',
              retryCount: m.retryCount + 1,
              errorMessage: undefined,
            }
          : m
      )
    );
    logAction('ارسال مجدد پیامک ناموفق', target.recipientPhone, `ارسال موفق به شماره ${target.recipientPhone}`, 'info', 'system');
    addToast({
      type: 'success',
      title: 'پیامک با موفقیت ارسال شد',
      message: `پیام به ${target.recipientPhone} تحویل داده شد.`,
    });
  };

  const retryAllFailedMessages = () => {
    const failedCount = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
    if (failedCount === 0) {
      addToast({ type: 'info', title: 'پیام ناموفقی در صف وجود ندارد' });
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.status === 'failed' || m.status === 'retrying'
          ? { ...m, status: 'delivered', sentAt: 'هم‌اکنون', retryCount: m.retryCount + 1, errorMessage: undefined }
          : m
      )
    );
    logAction('تلاش مجدد برای تمام پیام‌های ناموفق', `${failedCount} پیامک`, 'تمامی پیام‌های صف ناموفق با موفقیت تحویل شدند', 'info', 'system');
    addToast({
      type: 'success',
      title: `${failedCount} پیامک ناموفق مجدداً ارسال و تحویل شدند`,
    });
  };

  const sendBroadcastMessage = (salonName: string, text: string) => {
    const newMsg: DispatchMessage = {
      id: `msg-${Date.now()}`,
      recipientPhone: 'ارسال همگانی به اعضای فعال',
      salonName,
      templateType: 'custom_broadcast',
      text,
      status: 'delivered',
      gateway: 'Kavenegar',
      sentAt: 'هم‌اکنون',
      retryCount: 0,
      costRials: 4200000,
    };
    setMessages((prev) => [newMsg, ...prev]);
    logAction('ارسال پیامک همگانی سیستم', salonName, text.slice(0, 50) + '...', 'info', 'system');
    addToast({
      type: 'success',
      title: 'پیامک عمومی با موفقیت ارسال گردید',
    });
  };

  const updateTemplate = (id: string, pattern: string, enabled: boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pattern, enabled } : t))
    );
    addToast({
      type: 'success',
      title: 'الگوی پیامک بروزرسانی شد',
    });
  };

  // Support Ticket handlers
  const replyToTicket = (ticketId: string, replyContent: string) => {
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return;

    const newMsg = {
      id: `tm-${Date.now()}`,
      senderName: 'مهدی غوریانی (ادمین کل)',
      senderRole: 'admin' as const,
      content: replyContent,
      timestamp: 'هم‌اکنون',
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: 'in_progress', updatedAt: 'هم‌اکنون', messages: [...t.messages, newMsg] }
          : t
      )
    );
    logAction('پاسخ به تیکت پشتیبانی', target.ticketNumber, `پاسخ ادمین ثبت شد`, 'info', 'business');
    addToast({
      type: 'success',
      title: 'پاسخ تیکت با موفقیت ارسال شد',
      message: target.ticketNumber,
    });
  };

  const resolveTicket = (ticketId: string) => {
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return;
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'resolved', updatedAt: 'هم‌اکنون' } : t))
    );
    logAction('حل تیکت پشتیبانی', target.ticketNumber, 'وضعیت تیکت به حل‌شده تغییر یافت', 'info', 'business');
    addToast({
      type: 'success',
      title: 'تیکت به وضعیت حل‌شده تغییر یافت',
      message: target.ticketNumber,
    });
  };

  const closeTicket = (ticketId: string) => {
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return;
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'closed', updatedAt: 'هم‌اکنون' } : t))
    );
    addToast({
      type: 'info',
      title: 'تیکت بسته شد',
      message: target.ticketNumber,
    });
  };

  // Security handlers
  const terminateSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) return;
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    logAction('خروج اجباری نشست کاربری', target.userName, `IP: ${target.ipAddress} - مرورگر: ${target.browser}`, 'warning', 'auth');
    addToast({
      type: 'warning',
      title: 'نشست کاربری لغو و مسدود شد',
      message: `${target.userName} (${target.ipAddress})`,
    });
  };

  const terminateAllOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    logAction('لغو تمام نشست‌های دیگر', 'کل سیستم', 'تمام نشست‌های فعال به جز نشست جاری خاتمه یافتند', 'warning', 'auth');
    addToast({
      type: 'info',
      title: 'تمامی نشست‌های دیگر مسدود و خاتمه یافتند',
    });
  };

  const addIpToBlacklist = (ip: string) => {
    if (securitySettings.ipBlacklist.includes(ip)) return;
    setSecuritySettings((prev) => ({
      ...prev,
      ipBlacklist: [...prev.ipBlacklist, ip],
    }));
    logAction('افزودن IP به لیست سیاه فایروال', ip, 'مسدودسازی دسترسی ورودی', 'critical', 'auth');
    addToast({
      type: 'error',
      title: `آدرس ${ip} به لیست سیاه اضافه شد`,
    });
  };

  const removeIpFromBlacklist = (ip: string) => {
    setSecuritySettings((prev) => ({
      ...prev,
      ipBlacklist: prev.ipBlacklist.filter((item) => item !== ip),
    }));
    logAction('حذف IP از لیست سیاه فایروال', ip, 'رفع مسدودیت آدرس IP', 'info', 'auth');
    addToast({
      type: 'success',
      title: `آدرس ${ip} از لیست سیاه خارج شد`,
    });
  };

  const updateSecuritySettings = (settings: Partial<SecuritySettings>) => {
    setSecuritySettings((prev) => ({ ...prev, ...settings }));
    logAction('بروزرسانی تنظیمات امنیتی سیستم', 'پیکربندی امنیتی', JSON.stringify(settings), 'warning', 'system');
    addToast({
      type: 'success',
      title: 'تنظیمات امنیتی ذخیره و بلافاصله اعمال شدند',
    });
  };

  // Operations handlers
  const flushRedisCache = () => {
    setMetrics((prev) => ({
      ...prev,
      redisCacheHitRate: 99.2,
      memoryUsageMb: 980,
    }));
    logAction('پاکسازی کامل کش Redis', 'سرور کش حافظه', 'دستور FLUSHALL اجرا شد', 'warning', 'system');
    addToast({
      type: 'success',
      title: 'حافظه کش Redis با موفقیت تخلیه شد',
      message: 'کلیدهای منقضی و موقت پاکسازی شدند.',
    });
  };

  const runSystemDiagnostic = () => {
    setMetrics((prev) => ({
      ...prev,
      avgResponseTimeMs: 38,
      errorRatePercentage: 0.01,
      cpuLoadPercentage: 18,
    }));
    logAction('اجرای پایش سلامت خودکار', 'سیستم مرکزی', 'تمام تست‌های سلامت با موفقیت پاس شدند', 'info', 'system');
    addToast({
      type: 'success',
      title: 'تست سلامت سرورها با موفقیت انجام شد',
      message: 'تمامی سرویس‌های پایگاه‌داده، پیامک، درگاه پرداخت و وب‌ساکت فعال و پایدار هستند.',
    });
  };

  // Customer booking operations
  const addCustomerBooking = (booking: CustomerBooking) => {
    setCustomerBookings((prev) => [booking, ...prev]);
    // Increase salon appointments count
    setSalons((prev) =>
      prev.map((s) => (s.id === booking.salonId ? { ...s, totalAppointments: s.totalAppointments + 1 } : s))
    );
    logAction(
      `ثبت رزرو حضوری نوبت توسط مشتری (${booking.clientName})`,
      booking.salonName,
      `کد رهگیری: ${booking.trackingCode} | خدمت: ${booking.serviceName} | تسویه حضوری: ${booking.price.toLocaleString('fa-IR')} تومان`,
      'info',
      'business'
    );
    addToast({
      type: 'success',
      title: `نوبت شما با کد ${booking.trackingCode} با موفقیت ثبت شد`,
      message: `پرداخت به صورت ۱۰۰٪ حضوری در سالن انجام خواهد شد. پیامک تایید صادر شد.`,
    });
  };

  const cancelCustomerBooking = (id: string) => {
    const booking = customerBookings.find((b) => b.id === id);
    setCustomerBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
    );
    if (booking) {
      logAction(
        `لغو رزرو نوبت توسط کاربر (${booking.clientName})`,
        booking.salonName,
        `کد رهگیری: ${booking.trackingCode}`,
        'warning',
        'business'
      );
    }
    addToast({
      type: 'info',
      title: 'نوبت انتخابی با موفقیت لغو شد',
    });
  };

  const completeCustomerBookingInSalon = (bookingId: string) => {
    const booking = customerBookings.find((b) => b.id === bookingId);
    setCustomerBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b))
    );
    if (booking) {
      logAction(
        `تکمیل خدمت و ثبت تسویه حضوری در سالن (${booking.clientName})`,
        booking.salonName,
        `مبلغ تسویه حضوری: ${booking.price.toLocaleString('fa-IR')} تومان | کد: ${booking.trackingCode}`,
        'info',
        'business'
      );
    }
    addToast({
      type: 'success',
      title: 'خدمت تکمیل شد و تسویه حضوری ثبت گردید',
      message: 'نوبت با موفقیت تسویه و در فاکتورهای تکمیل‌شده سالن ذخیره شد.',
    });
  };

  const logoutClientSession = () => {
    setClientSession({
      isLoggedIn: false,
      phone: '',
      name: '',
    });
    addToast({
      type: 'info',
      title: 'از حساب کاربری خارج شدید',
    });
  };

  return (
    <AdminContext.Provider
      value={{
        activeTab,
        setActiveTab,
        salons,
        setSalons,
        users,
        setUsers,
        plans,
        transactions,
        messages,
        templates,
        tickets,
        auditLogs,
        sessions,
        metrics,
        securitySettings,
        updateSecuritySettings,
        approveSalon,
        suspendSalon,
        activateSalon,
        updateSalonPlan,
        saveSalon,
        deleteSalon,
        banUser,
        unbanUser,
        updateUserRole,
        toggleUser2FA,
        saveUser,
        retryFailedMessage,
        retryAllFailedMessages,
        sendBroadcastMessage,
        updateTemplate,
        replyToTicket,
        resolveTicket,
        closeTicket,
        terminateSession,
        terminateAllOtherSessions,
        addIpToBlacklist,
        removeIpFromBlacklist,
        flushRedisCache,
        runSystemDiagnostic,
        inspectedSalon,
        setInspectedSalon,
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
        persona,
        setPersona,
        currentSalonSlug,
        setCurrentSalonSlug,
        clientSession,
        setClientSession,
        logoutClientSession,
        viewMode,
        setViewMode,
        selectedCustomerSalonId,
        setSelectedCustomerSalonId,
        customerBookings,
        addCustomerBooking,
        cancelCustomerBooking,
        completeCustomerBookingInSalon,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
