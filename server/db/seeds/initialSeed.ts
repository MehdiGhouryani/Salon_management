import { config } from '../../config.ts';
import { withTransaction, isDatabaseConfigured } from '../pool.ts';
import { userRepository } from '../../repositories/userRepository.ts';
import { salonRepository } from '../../repositories/salonRepository.ts';
import { serviceRepository } from '../../repositories/serviceRepository.ts';
import { staffRepository } from '../../repositories/staffRepository.ts';
import { clientRepository } from '../../repositories/clientRepository.ts';
import { appointmentRepository } from '../../repositories/appointmentRepository.ts';
import { auditLogRepository } from '../../repositories/auditLogRepository.ts';

export async function runInitialSeed(options: { forceProduction?: boolean } = {}): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured. Cannot run seed script.');
  }

  if (config.isProduction && !options.forceProduction) {
    throw new Error(
      'SAFETY LOCK: Cannot run development seeds in production environment without --force-production-seed flag.'
    );
  }

  console.log('[NobatAra Seeder] Starting development fixture seeding...');

  await withTransaction(async (client) => {
    // 1. Seed Platform Super Admin User
    console.log(' -> Seeding platform super-admin user...');
    let superAdmin = await userRepository.findByPhone('+989120000001', client);
    if (!superAdmin) {
      superAdmin = await userRepository.create(
        {
          phone: '+989120000001',
          fullName: 'مدیر کل سامانه نوبت‌آرا (حساب مرکزی)',
          email: 'security@nobatara.ir',
          platformRole: 'super_admin',
          status: 'active',
          twoFactorEnabled: true,
        },
        client
      );
    }

    // 2. Seed Salon Owner User
    console.log(' -> Seeding salon owner user...');
    let salonOwner = await userRepository.findByPhone('+989121111111', client);
    if (!salonOwner) {
      salonOwner = await userRepository.create(
        {
          phone: '+989121111111',
          fullName: 'سارا رادمنش (مدیر گیس‌آرا)',
          email: 'gisara.manager@gmail.com',
          platformRole: 'user',
          status: 'active',
          twoFactorEnabled: false,
        },
        client
      );
    }

    // 3. Seed Canonical Salons
    console.log(' -> Seeding canonical salons (Gisara, Kazhal, Ahou)...');
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const salonsData = [
      {
        id: 'sal-101',
        slug: 'gisara',
        name: 'سالن زیبایی و عروس گیس‌آرا',
        category: 'عروس و خدمات VIP',
        tagline: 'مرکز تخصصی عروس، رنگ، لایت و خدمات VIP زیبایی در محیطی آرام و مجلل',
        ownerName: 'سارا رادمنش',
        phone: '02122409876',
        email: 'info@gisara.ir',
        province: 'تهران',
        city: 'تهران (زعفرانیه)',
        address: 'خیابان آصف، مجتمع تجاری رویال، طبقه ۳، واحد ۳۰۲',
        status: 'active' as const,
        plan: 'gold_vip' as const,
        planExpiry: expiryDate,
        verifiedBadge: true,
        timezone: 'Asia/Tehran',
        bannerImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
        galleryImages: [
          'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
        ],
        features: ['پارکینگ اختصاصی', 'کافی‌شاپ VIP', 'مواد ارگانیک بدون آمونیاک', 'پرداخت حضوری با پوز'],
        rating: 4.9,
        reviewsCount: 348,
      },
      {
        id: 'sal-102',
        slug: 'kazhal',
        name: 'کلینیک و مرکز ناخن کژال',
        category: 'ناخن و پدیکور تخصصی',
        tagline: 'طراحی ژورنالی ناخن و اسپا تخصصی دست و پا با متریال برتر آلمانی',
        ownerName: 'مهسا کاظمی',
        phone: '02634456789',
        email: 'info@kazhalbeauty.ir',
        province: 'البرز',
        city: 'کرج (گوهردشت)',
        address: 'فلکه اول گوهردشت، برج نیکامال، طبقه ۴',
        status: 'active' as const,
        plan: 'silver' as const,
        planExpiry: expiryDate,
        verifiedBadge: true,
        timezone: 'Asia/Tehran',
        bannerImage: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1200&q=80',
        galleryImages: [
          'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=800&q=80',
        ],
        features: ['استریلیزاسیون پزشکی اتوکلاو', 'لاک ژل‌های ضد حساسیت', 'تخفیف مشتریان وفادار'],
        rating: 4.8,
        reviewsCount: 194,
      },
    ];

    for (const s of salonsData) {
      const existing = await salonRepository.findById(s.id, client);
      if (!existing) {
        await salonRepository.create(s, client);
      }
    }

    // Link owner to Gisara salon
    await userRepository.addMembership(salonOwner.id, 'sal-101', 'owner', ['all'], client);

    // 4. Seed Services for Gisara
    console.log(' -> Seeding services for sal-101...');
    const servicesData = [
      {
        id: 'srv-101',
        salonId: 'sal-101',
        name: 'رنگ و هایلایت تخصصی مو (آمبره و بالیاژ)',
        category: 'hair',
        categoryLabel: 'خدمات تخصصی مو',
        durationMinutes: 180,
        price: 2400000,
        description: 'استفاده از متریال درجه یک لورال با حفاظت کامل از بافت مو و رنگساژ دلخواه',
      },
      {
        id: 'srv-102',
        salonId: 'sal-101',
        name: 'کراتین، بوتاکس و پروتئین‌تراپی مو',
        category: 'hair',
        categoryLabel: 'خدمات تخصصی مو',
        durationMinutes: 210,
        price: 3600000,
        description: 'احیای ۱۰۰٪ و صافی شلاقی با ماندگاری ۹ ماهه بدون گاز و بو',
      },
      {
        id: 'srv-103',
        salonId: 'sal-101',
        name: 'کاشت و ژلیش روسی ناخن',
        category: 'nail',
        categoryLabel: 'ناخن و پدیکور',
        durationMinutes: 90,
        price: 680000,
        description: 'کاشت ژل با دوام بالا، مانیکور روسی اصولی و طراحی ژورنالی',
      },
      {
        id: 'srv-104',
        salonId: 'sal-101',
        name: 'پدیکور درمانی و کفسابی اسپا',
        category: 'spa',
        categoryLabel: 'اسپا و آرامش',
        durationMinutes: 60,
        price: 550000,
        description: 'کوکتل تراپی، نمک دریایی، پارافین تراپی و ماساژ ریلکسی پا',
      },
      {
        id: 'srv-105',
        salonId: 'sal-101',
        name: 'میکاپ VIP عروس و همراه',
        category: 'makeup',
        categoryLabel: 'میکاپ و چهره',
        durationMinutes: 150,
        price: 4500000,
        description: 'گریم سینمایی با برندهای مک، نارس و هدی بیوتی با کانتورینگ حرفه‌ای',
      },
    ];

    for (const srv of servicesData) {
      const existing = await serviceRepository.findById(srv.id, client);
      if (!existing) {
        await serviceRepository.create(srv, client);
      }
    }

    // 5. Seed Staff for Gisara
    console.log(' -> Seeding staff for sal-101...');
    const staffData = [
      {
        id: 'stf-101',
        salonId: 'sal-101',
        userId: salonOwner.id,
        name: 'سارا رادمنش',
        phone: '09121111111',
        role: 'مدیر هنری و متخصص ارشد رنگ و لایت',
        specialty: 'رنگ و لایت تخصصی',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
        rating: 4.98,
      },
      {
        id: 'stf-102',
        salonId: 'sal-101',
        name: 'الناز افشار',
        phone: '09122222222',
        role: 'آرتیست ارشد ناخن و اسپا',
        specialty: 'کاشت روسی و ژلیش',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        rating: 4.92,
      },
      {
        id: 'stf-103',
        salonId: 'sal-101',
        name: 'مریم فلاحی',
        phone: '09123333333',
        role: 'متخصص احیا و تراپی مو',
        specialty: 'کراتین و پروتئین',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        rating: 4.87,
      },
      {
        id: 'stf-104',
        salonId: 'sal-101',
        name: 'رویا کمالی',
        phone: '09124444444',
        role: 'میکاپ آرتیست عروس',
        specialty: 'میکاپ VIP',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        rating: 4.95,
      },
    ];

    for (const st of staffData) {
      const existing = await staffRepository.findById(st.id, client);
      if (!existing) {
        await staffRepository.create(st, client);
      }
    }

    // Assign services to staff
    await staffRepository.assignService('stf-101', 'srv-101', null, null, true, client);
    await staffRepository.assignService('stf-102', 'srv-103', null, null, true, client);
    await staffRepository.assignService('stf-102', 'srv-104', null, null, false, client);
    await staffRepository.assignService('stf-103', 'srv-102', null, null, true, client);
    await staffRepository.assignService('stf-104', 'srv-105', null, null, true, client);

    // 6. Seed Working Hours
    console.log(' -> Seeding working hours for sal-101...');
    const weeklyHours = [
      { dayOfWeek: 0, startTime: '09:30', endTime: '20:00', isClosed: false }, // شنبه
      { dayOfWeek: 1, startTime: '09:30', endTime: '20:00', isClosed: false }, // یکشنبه
      { dayOfWeek: 2, startTime: '09:30', endTime: '20:00', isClosed: false }, // دوشنبه
      { dayOfWeek: 3, startTime: '09:30', endTime: '20:00', isClosed: false }, // سه‌شنبه
      { dayOfWeek: 4, startTime: '09:30', endTime: '20:00', isClosed: false }, // چهارشنبه
      { dayOfWeek: 5, startTime: '09:30', endTime: '18:00', isClosed: false }, // پنج‌شنبه
      { dayOfWeek: 6, startTime: '10:00', endTime: '16:00', isClosed: true },  // جمعه (تعطیل)
    ];
    await salonRepository.setWorkingHours('sal-101', weeklyHours, client);

    // 7. Seed Sample Clients & Appointments
    console.log(' -> Seeding sample clients and initial appointments...');
    const client1 = await clientRepository.createOrUpdate(
      {
        phone: '09123456789',
        fullName: 'رویا حسینی',
        notes: 'مشتری ثابت سالن - علاقه‌مند به رنگ‌های شنی و کرمی',
      },
      client
    );
    await clientRepository.recordBookingVisit('sal-101', client1.id, 2400000, client);

    const client2 = await clientRepository.createOrUpdate(
      {
        phone: '09351234567',
        fullName: 'الهام سمیعی',
        notes: 'مشتری جدید - حساسیت پوستی خفیف به استون',
      },
      client
    );
    await clientRepository.recordBookingVisit('sal-101', client2.id, 680000, client);

    // Sample Appointments
    const existingApt1 = await appointmentRepository.findById('apt-101', client);
    if (!existingApt1) {
      await appointmentRepository.create(
        {
          id: 'apt-101',
          trackingCode: 'GIS-8921',
          salonId: 'sal-101',
          serviceId: 'srv-101',
          staffId: 'stf-101',
          clientId: client1.id,
          clientName: 'رویا حسینی',
          clientPhone: '09123456789',
          bookingDate: '1403/08/20',
          bookingTime: '10:30',
          endTime: '13:30',
          price: 2400000,
          paymentMethod: 'in_person',
          paymentStatus: 'pending',
          status: 'confirmed',
          notes: 'لطفا رنگساژ دودی نسکافه‌ای مد نظر قرار گیرد',
          isDemo: true,
        },
        client
      );
    }

    const existingApt2 = await appointmentRepository.findById('apt-102', client);
    if (!existingApt2) {
      await appointmentRepository.create(
        {
          id: 'apt-102',
          trackingCode: 'GIS-8922',
          salonId: 'sal-101',
          serviceId: 'srv-103',
          staffId: 'stf-102',
          clientId: client2.id,
          clientName: 'الهام سمیعی',
          clientPhone: '09351234567',
          bookingDate: '1403/08/20',
          bookingTime: '14:00',
          endTime: '15:30',
          price: 680000,
          paymentMethod: 'in_person',
          paymentStatus: 'pending',
          status: 'confirmed',
          notes: 'طراحی فرنچ کلاسیک',
          isDemo: true,
        },
        client
      );
    }

    // 8. Seed Initial Audit Log
    console.log(' -> Seeding initial audit log...');
    await auditLogRepository.create(
      {
        actor: 'سیستم راه‌اندازی پایگاه داده',
        actorRole: 'system_initializer',
        action: 'تزریق داده‌های اولیه آزمایشی (Initial Seed)',
        target: 'PostgreSQL Relational Schema',
        ipAddress: '127.0.0.1',
        userAgent: 'NobatAra-Database-Seeder/1.0',
        severity: 'info',
        category: 'system',
        details: {
          salonsCount: 2,
          servicesCount: 5,
          staffCount: 4,
          environment: config.nodeEnv,
        },
        isDemo: true,
      },
      client
    );
  });

  console.log('✅ [NobatAra Seeder] Development fixture seeding completed successfully.');
}
