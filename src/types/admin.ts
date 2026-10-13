export type SalonStatus = 'active' | 'pending' | 'suspended' | 'trial';
export type PlanType = 'bronze' | 'silver' | 'gold_vip';
export type UserRole = 'super_admin' | 'salon_admin' | 'staff' | 'support_auditor' | 'financial_manager';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type MessageStatus = 'delivered' | 'queued' | 'failed' | 'retrying';
export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface Salon {
  id: string;
  name: string;
  category: string;
  ownerName: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  address: string;
  status: SalonStatus;
  plan: PlanType;
  planExpiry: string;
  monthlyRevenue: number;
  totalAppointments: number;
  activeStaffCount: number;
  verifiedBadge: boolean;
  registeredAt: string;
  servicesCount: number;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  salonId?: string;
  salonName?: string;
  status: 'active' | 'banned' | 'inactive';
  twoFactorEnabled: boolean;
  lastLogin: string;
  lastIp: string;
  avatar?: string;
  createdAt: string;
}

export interface Plan {
  id: PlanType;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxStaff: number;
  maxAppointmentsPerMonth: number;
  smsIncluded: number;
  customDomain: boolean;
  vipSupport: boolean;
  activeSubscribers: number;
}

export interface Transaction {
  id: string;
  salonId: string;
  salonName: string;
  amount: number;
  type: 'subscription' | 'sms_topup'; // All online gateway transactions are B2B salon subscriptions/topups
  gateway: 'Zarinpal' | 'Saman' | 'Mellat';
  trackingCode: string;
  status: 'successful' | 'failed' | 'refunded';
  date: string;
}

export interface DispatchMessage {
  id: string;
  recipientPhone: string;
  salonName: string;
  templateType: 'appointment_reminder' | 'booking_confirmed' | 'cancelled' | 'invoice' | 'custom_broadcast';
  text: string;
  status: MessageStatus;
  gateway: 'Kavenegar' | 'MelliSMS' | 'FarazSMS';
  sentAt: string;
  retryCount: number;
  costRials: number;
  errorMessage?: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  type: DispatchMessage['templateType'];
  pattern: string;
  enabled: boolean;
  samplePreview: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  salonId: string;
  salonName: string;
  creatorName: string;
  creatorRole: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: 'technical' | 'financial' | 'sms' | 'account';
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    senderName: string;
    senderRole: 'salon' | 'admin';
    content: string;
    timestamp: string;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  ipAddress: string;
  userAgent: string;
  severity: AuditSeverity;
  category: 'auth' | 'privilege' | 'business' | 'financial' | 'system';
  details: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  role: string;
  ipAddress: string;
  location: string;
  browser: string;
  device: string;
  startedAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface SystemMetrics {
  uptimePercentage: number;
  avgResponseTimeMs: number;
  errorRatePercentage: number;
  dbQueriesPerSec: number;
  redisCacheHitRate: number;
  cpuLoadPercentage: number;
  memoryUsageMb: number;
  totalMemoryMb: number;
  activeWebsockets: number;
}

export interface SecuritySettings {
  twoFactorEnforcedForAdmins: boolean;
  maxFailedLoginsBeforeLock: number;
  sessionTimeoutMinutes: number;
  rateLimitPerMinute: number;
  maintenanceMode: boolean;
  dataMaskingEnabled: boolean;
  ipBlacklist: string[];
}
