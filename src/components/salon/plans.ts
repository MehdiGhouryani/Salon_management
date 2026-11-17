export type PlanId = 'gold_vip' | 'silver' | 'bronze';

export interface PlanInfo {
  id: PlanId;
  /** "اشتراک طلایی VIP" */
  title: string;
  /** name shown in the purchase list, with its period */
  offer: string;
  price: number;
  features: string;
}

/** One definition per plan: the profile card and the purchase sheet both read from here. */
export const PLANS: Record<PlanId, PlanInfo> = {
  gold_vip: {
    id: 'gold_vip',
    title: 'اشتراک طلایی VIP',
    offer: 'بسته طلایی VIP (۳ ماهه)',
    price: 3490000,
    features: 'پرسنل نامحدود، پیامک رایگان، نشان تأیید',
  },
  silver: {
    id: 'silver',
    title: 'اشتراک نقره‌ای',
    offer: 'بسته نقره‌ای (۱ ماهه)',
    price: 1790000,
    features: 'تا ۸ پرسنل، ۳۰۰ پیامک',
  },
  bronze: {
    id: 'bronze',
    title: 'اشتراک برنزی پایه',
    offer: 'بسته برنزی پایه (۱ ماهه)',
    price: 890000,
    features: 'تا ۳ پرسنل',
  },
};

/** Only the Zarinpal provider is implemented and server-verified in production. */
export const GATEWAYS = [
  { id: 'zarinpal', name: 'زرین‌پال' },
] as const;

export type GatewayId = (typeof GATEWAYS)[number]['id'];
