export interface SalonServiceItem {
  id: string;
  name: string;
  category: 'hair' | 'nail' | 'skin' | 'makeup' | 'lash' | 'men' | 'spa';
  categoryLabel: string;
  duration: string;
  price: number;
  description: string;
}

export interface SalonStaffItem {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  specialty: string;
}

export interface DetailedSalonData {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  rating: number;
  reviewsCount: number;
  bannerImage: string;
  galleryImages: string[];
  workingHours: string;
  address: string;
  city: string;
  phone: string;
  features: string[];
  services: SalonServiceItem[];
  staff: SalonStaffItem[];
  reviews: {
    author: string;
    date: string;
    comment: string;
    rating: number;
  }[];
}

export const salonDirectoryDetails: Record<string, DetailedSalonData> = {
  'sal-101': {
    id: 'sal-101',
    slug: 'gisara',
    name: 'سالن زیبایی و عروس گیس‌آرا',
    tagline: 'مرکز تخصصی عروس، رنگ، لایت و خدمات VIP زیبایی در محیطی آرام و مجلل',
    rating: 4.9,
    reviewsCount: 348,
    bannerImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
    ],
    workingHours: 'همه روزه ۹:۳۰ الی ۲۰:۰۰ (جمعه‌ها با هماهنگی قبلی)',
    address: 'خیابان آصف، مجتمع تجاری رویال، طبقه ۳، واحد ۳۰۲',
    city: 'تهران (زعفرانیه)',
    phone: '02122409876',
    features: ['پارکینگ اختصاصی', 'کافی‌شاپ VIP', 'مواد ارگانیک بدون آمونیاک', 'پرداخت حضوری با پوز'],
    services: [
      {
        id: 'srv-101',
        name: 'رنگ و هایلایت تخصصی مو (آمبره و بالیاژ)',
        category: 'hair',
        categoryLabel: 'خدمات تخصصی مو',
        duration: '۱۸۰ دقیقه',
        price: 2400000,
        description: 'استفاده از متریال درجه یک لورال با حفاظت کامل از بافت مو و رنگساژ دلخواه',
      },
      {
        id: 'srv-102',
        name: 'کراتین، بوتاکس و پروتئین‌تراپی مو',
        category: 'hair',
        categoryLabel: 'خدمات تخصصی مو',
        duration: '۲۱۰ دقیقه',
        price: 3600000,
        description: 'احیای ۱۰۰٪ و صافی شلاقی با ماندگاری ۹ ماهه بدون گاز و بو',
      },
      {
        id: 'srv-103',
        name: 'کاشت و ژلیش روسی ناخن',
        category: 'nail',
        categoryLabel: 'ناخن و پدیکور',
        duration: '۹۰ دقیقه',
        price: 680000,
        description: 'کاشت ژل با دوام بالا، مانیکور روسی اصولی و طراحی ژورنالی',
      },
      {
        id: 'srv-104',
        name: 'پدیکور درمانی و کفسابی اسپا',
        category: 'spa',
        categoryLabel: 'اسپا و آرامش',
        duration: '۶۰ دقیقه',
        price: 550000,
        description: 'کوکتل تراپی، نمک دریایی، پارافین تراپی و ماساژ ریلکسی پا',
      },
      {
        id: 'srv-105',
        name: 'میکاپ و شینیون VIP فرمالیته و مجالس',
        category: 'makeup',
        categoryLabel: 'میکاپ و چهره',
        duration: '۱۲۰ دقیقه',
        price: 3200000,
        description: 'کانتورینگ حرفه‌ای با کرم‌پودرهای هدی بیوتی و ماندگاری ۲۴ ساعته ضدآب',
      },
      {
        id: 'srv-106',
        name: 'اکستنشن مژه تار به تار والیوم',
        category: 'lash',
        categoryLabel: 'مژه و ابرو',
        duration: '۱۲۰ دقیقه',
        price: 850000,
        description: 'تارهای ابریشمی فوق سبک با چسب ضد حساسیت ساخت کره',
      },
    ],
    staff: [
      {
        id: 'st-1',
        name: 'ندا سلطانی',
        role: 'مستر هیرکالر و لایت',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        rating: 4.9,
        specialty: 'بالیاژ روسی و احیا مو',
      },
      {
        id: 'st-2',
        name: 'مریم اکبری',
        role: 'متخصص کاشت ناخن و اسپا',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
        rating: 4.8,
        specialty: 'طراحی مینیاتوری و پدیکور',
      },
      {
        id: 'st-3',
        name: 'مهتاب کیانی',
        role: 'میکاپ آرتیست ارشد',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        rating: 5.0,
        specialty: 'میکاپ عروس و لایت اروپایی',
      },
    ],
    reviews: [
      {
        author: 'فرشته احمدی',
        date: '۲ روز پیش',
        comment: 'فوق‌العاده بود! خیلی خوشحالم که پرداخت حضوریه و بدون دغدغه رفتم سالن و با پوز پرداخت کردم.',
        rating: 5,
      },
      {
        author: 'ساناز شفیعی',
        date: 'هفته پیش',
        comment: 'کار لایت موی خانم سلطانی بی‌نظیره، بدون ذره‌ای سوختگی به پایه ۱۰ رسید.',
        rating: 5,
      },
    ],
  },

  'sal-102': {
    id: 'sal-102',
    slug: 'kazhal',
    name: 'مرکز تخصصی مراقبت پوست و مو کژال',
    tagline: 'کلینیک پیشرو در جوانسازی، فیشیال تخصصی و سلامت درماتولوژی',
    rating: 4.8,
    reviewsCount: 215,
    bannerImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512290900672-1f41d996d9eb?auto=format&fit=crop&w=800&q=80',
    ],
    workingHours: 'شنبه تا چهارشنبه ۱۰:۰۰ الی ۱۹:۰۰',
    address: 'خیابان چهارباغ بالا، ساختمان نگین، طبقه ۲',
    city: 'اصفهان (چهارباغ بالا)',
    phone: '03136201122',
    features: ['دستگاه‌های فیشیال هیدرافیشیال اصل', 'تحت نظارت پزشک', 'کابین‌های اختصاصی و استریل', 'پرداخت در محل کلینیک'],
    services: [
      {
        id: 'srv-201',
        name: 'فیشیال و پاکسازی عمیق پوست (هیدرافیشیال ۱۱ کاره)',
        category: 'skin',
        categoryLabel: 'مراقبت پوست و فیشیال',
        duration: '۷۵ دقیقه',
        price: 950000,
        description: 'لایه برداری با آب، میکرودرم، آبرسانی عمیق و بستن منافذ باز با ماسک طلا',
      },
      {
        id: 'srv-202',
        name: 'میکرونیدلینگ و مزوتراپی جوانسازی',
        category: 'skin',
        categoryLabel: 'مراقبت پوست و فیشیال',
        duration: '۶۰ دقیقه',
        price: 1450000,
        description: 'تحریک کلاژن‌سازی، رفع جای جوش و لک‌های بارداری با کوکتل‌های فیوژن',
      },
      {
        id: 'srv-203',
        name: 'ماساژ لیفتینگ تخصصی صورت با گواشا و سنگ جید',
        category: 'spa',
        categoryLabel: 'اسپا و آرامش',
        duration: '۴۵ دقیقه',
        price: 480000,
        description: 'تخلیه لنفاوی، رفع افتادگی غبغب و گونه‌گذاری طبیعی بدون تزریق',
      },
    ],
    staff: [
      {
        id: 'st-21',
        name: 'دکتر الناز صبوری',
        role: 'پزشک پوست و زیبایی',
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80',
        rating: 4.9,
        specialty: 'مزوتراپی و پیلینگ درمانی',
      },
      {
        id: 'st-22',
        name: 'سحر نیک‌نژاد',
        role: 'اسکین کر آرتیست',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        rating: 4.8,
        specialty: 'هیدرافیشیال و ماساژ فاشیال',
      },
    ],
    reviews: [
      {
        author: 'زهرا کاظمی',
        date: '۳ روز پیش',
        comment: 'پوستم مثل آینه شفاف شد. برخورد پرسنل عالی و بدون معطلی نوبتم انجام شد.',
        rating: 5,
      },
    ],
  },

  'sal-103': {
    id: 'sal-103',
    slug: 'barberclub',
    name: 'آرایشگاه آقایان پیرایش باربرکلاب',
    tagline: 'پیرایش مدرن آقایان، خدمات اختصاصی داماد و مراقبت مو و ریش',
    rating: 4.9,
    reviewsCount: 412,
    bannerImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
    ],
    workingHours: 'همه روزه ۱۰:۰۰ الی ۲۲:۰۰ یکسره',
    address: 'بلوار شهرداری، خیابان بهار، پلاک ۴۱',
    city: 'تهران (سعادت‌آباد)',
    phone: '02122087654',
    features: ['محیط مدرن و پذیرایی رایگان', 'پکیج کامل داماد VIP', 'استریل تجهیزات با UV', 'پرداخت حضوری با کارتخوان'],
    services: [
      {
        id: 'srv-301',
        name: 'پیرایش هیرکات مدرن فید و استایل مو',
        category: 'men',
        categoryLabel: 'پیرایش آقایان',
        duration: '۴۵ دقیقه',
        price: 350000,
        description: 'فید اصولی سایه، استایلینگ با پماد مات و شستشوی سر',
      },
      {
        id: 'srv-302',
        name: 'آنکارد و فرم‌دهی ریش با تیغ و حوله داغ',
        category: 'men',
        categoryLabel: 'پیرایش آقایان',
        duration: '۳۰ دقیقه',
        price: 220000,
        description: 'اسپا ریش، روغن‌تراپی و فرم‌دهی دقیق مطابق با فرم فک و صورت',
      },
      {
        id: 'srv-303',
        name: 'پکیج VIP داماد (شامل فیشیال، هیرکات، گریم و استایل)',
        category: 'men',
        categoryLabel: 'پیرایش آقایان',
        duration: '۱۸۰ دقیقه',
        price: 2800000,
        description: 'پاکسازی عمیق پوست، گریم محو و نچرال، فرم‌دهی مو با ماندگاری کامل',
      },
    ],
    staff: [
      {
        id: 'st-31',
        name: 'امیرحسین رادمنش',
        role: 'مدیر و مستر باربر',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        rating: 4.9,
        specialty: 'گریم داماد و استایل مو',
      },
    ],
    reviews: [
      {
        author: 'رضا پاشایی',
        date: 'دیروز',
        comment: 'بهترین باربرشاپ غرب تهران، بدون معطلی و دقیقاً سر تایم نوبت تحویل دادند.',
        rating: 5,
      },
    ],
  },

  'sal-105': {
    id: 'sal-105',
    slug: 'rosegold',
    name: 'سالن ناخن و پدیکور رزگلد',
    tagline: 'تخصصی‌ترین مرکز مانیکور، پدیکور اسپا و طراحی ناخن در مشهد',
    rating: 4.8,
    reviewsCount: 189,
    bannerImage: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    ],
    workingHours: 'شنبه تا پنج‌شنبه ۱۰:۰۰ الی ۱۹:۳۰',
    address: 'بلوار سجاد، خیابان بهار، ساختمان بهاران، طبقه ۱',
    city: 'مشهد (سجاد)',
    phone: '05137665544',
    features: ['تهویه ضد بوی مونومر', 'بیش از ۴۰۰ رنگ لاکژل', 'ضدعفونی اتوکلاو پزشکی', 'پرداخت نقد و کارتخوان در سالن'],
    services: [
      {
        id: 'srv-501',
        name: 'کاشت پلی‌ژل و لمینت استحکام‌بخش ناخن',
        category: 'nail',
        categoryLabel: 'ناخن و پدیکور',
        duration: '۸۰ دقیقه',
        price: 580000,
        description: 'کاشت سبک و طبیعی بدون آسیب به صدف ناخن با ماندگاری ۴ هفته',
      },
      {
        id: 'srv-502',
        name: 'پدیکور VIP اسپا با حباب و سنگ داغ',
        category: 'spa',
        categoryLabel: 'اسپا و آرامش',
        duration: '۶۰ دقیقه',
        price: 490000,
        description: 'تسکین خستگی پا، کفسابی حرفه‌ای ترک پا و رطوبت‌رسانی عمیق',
      },
    ],
    staff: [
      {
        id: 'st-51',
        name: 'پریا دادرس',
        role: 'مستر نیل آرتیست',
        avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=200&q=80',
        rating: 4.9,
        specialty: 'طراحی فرنچ و لمینت روسی',
      },
    ],
    reviews: [
      {
        author: 'مونا یوسفی',
        date: 'هفته گذشته',
        comment: 'تمیزترین سالن ناخن مشهد، ابزارهاشون جلوی چشم مشتری از بسته استریل باز میشه.',
        rating: 5,
      },
    ],
  },
};

// Fallback generator for other salons in initialSalons
export function getSalonDetail(salonId: string, baseSalon?: any): DetailedSalonData {
  if (salonDirectoryDetails[salonId]) {
    return salonDirectoryDetails[salonId];
  }

  const generatedSlug = baseSalon?.slug || salonId.replace('sal-', 'salon-');

  return {
    id: salonId,
    slug: generatedSlug,
    name: baseSalon?.name || 'سالن زیبایی تخصصی',
    tagline: baseSalon?.notes || 'خدمات باکیفیت و حرفه‌ای زیبایی و مراقبت',
    rating: 4.8,
    reviewsCount: 142,
    bannerImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    ],
    workingHours: 'همه روزه ۱۰:۰۰ الی ۲۰:۰۰',
    address: baseSalon?.address || 'خیابان اصلی، مجتمع تجاری آریا',
    city: baseSalon?.city || 'تهران',
    phone: baseSalon?.phone || '02188990011',
    features: ['پرسنل مجرب و دارای مدرک بین‌المللی', 'رعایت پروتکل‌های بهداشتی', 'تسویه حضوری در سالن'],
    services: [
      {
        id: `srv-${salonId}-1`,
        name: 'کوپ ژورنالی و استایل مو',
        category: 'hair',
        categoryLabel: 'خدمات تخصصی مو',
        duration: '۶۰ دقیقه',
        price: 450000,
        description: 'کوپ متناسب با فرم صورت و استایلینگ با سشوار حرفه‌ای',
      },
      {
        id: `srv-${salonId}-2`,
        name: 'ژلیش و مانیکور دست',
        category: 'nail',
        categoryLabel: 'ناخن و پدیکور',
        duration: '۵۰ دقیقه',
        price: 320000,
        description: 'مرتب‌سازی کوتیکول و لاک‌ژل سه مرحله‌ای با ماندگاری بالا',
      },
      {
        id: `srv-${salonId}-3`,
        name: 'فیشیال پاکسازی پوست',
        category: 'skin',
        categoryLabel: 'مراقبت پوست و فیشیال',
        duration: '۶۰ دقیقه',
        price: 750000,
        description: 'پاکسازی لایه‌های شاخی، تخلیه کومدون و ماسک آبرسان',
      },
    ],
    staff: [
      {
        id: `st-${salonId}-1`,
        name: baseSalon?.ownerName || 'متخصص ارشد سالن',
        role: 'مدیر و سرپرست بیوتی',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        rating: 4.8,
        specialty: 'کلیه خدمات تخصصی زیبایی',
      },
    ],
    reviews: [
      {
        author: 'مشتری محترم',
        date: 'هفته گذشته',
        comment: 'بسیار از کیفیت کار و تمیزی سالن راضی بودم. امکان پرداخت حضوری هم خیلی عالیه.',
        rating: 5,
      },
    ],
  };
}

export const luxuryBannerPresets = [
  {
    id: 'banner-gisara-lux',
    name: 'استودیوی مدرن و مینیمال',
    url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-gold-marble',
    name: 'سالن مرمرین VIP طلایی',
    url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-light-makeup',
    name: 'استودیو میکاپ و چهره رویال',
    url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-rose-spa',
    name: 'اسپا و پدیکور آرامش مخملی',
    url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'banner-chic-hair',
    name: 'لاین استایلینگ و رنگ موی VIP',
    url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80',
  },
];

export function getSalonBySlug(slug: string, salonsList?: any[]): DetailedSalonData {
  // Check predefined detailed map
  const foundInMap = Object.values(salonDirectoryDetails).find(
    (s) => s.slug.toLowerCase() === slug.toLowerCase()
  );
  if (foundInMap) return foundInMap;

  // Check salonsList
  if (salonsList) {
    const matchedSalon = salonsList.find(
      (s) => s.slug?.toLowerCase() === slug.toLowerCase() || s.id === slug
    );
    if (matchedSalon) {
      return getSalonDetail(matchedSalon.id, matchedSalon);
    }
  }

  // Default to Gisara
  return salonDirectoryDetails['sal-101'];
}

export function updateSalonDetails(slug: string, updates: Partial<DetailedSalonData>): DetailedSalonData {
  const current = getSalonBySlug(slug);
  const updated = {
    ...current,
    ...updates,
  };
  salonDirectoryDetails[current.id] = updated;
  return updated;
}


