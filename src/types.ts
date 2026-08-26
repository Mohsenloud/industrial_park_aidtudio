export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface RegisteredUserItem {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role?: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive?: boolean;
  hasUnit: boolean;
  unitCount: number;
  units: Unit[];
}

export interface Unit {
  id: string;
  ownerId: string;
  name: string;
  phone: string; // تلفن ثابت
  mobile1?: string; // شماره موبایل ۱
  mobile2?: string; // شماره موبایل ۲
  address: string;
  description: string;
  category: string;
  profileImage: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string; // لینک نقشه نشان، بلد یا گوگل مپ
  seoKeywords?: string; // کلمات کلیدی سئو (با کاما جدا شوند)
  seoDescription?: string; // توضیحات سئو
  email?: string; // ایمیل کارگاه
  website?: string; // وب‌سایت کارگاه
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  reviewCount?: number;
  badges?: string[]; // نشان‌ها و افتخارات رسمی تایید شده کارگاه
  ownerUser?: {
    uid: string;
    name: string;
    phone: string;
    email: string;
    createdAt?: string;
    lastLoginAt?: string;
  } | null;
}

export interface Product {
  id: string;
  unitId: string;
  ownerId: string;
  name: string;
  description: string;
  image: string;
  price?: string;
  seoKeywords?: string; // کلمات کلیدی سئو (با کاما جدا شوند)
  seoDescription?: string; // توضیحات سئو
  createdAt: string;
}

export interface BannerAd {
  id: string;
  companyName: string;
  title: string;
  subtitle?: string; // شعار یا عنوان فرعی
  description: string;
  image: string; // تصویر پس‌زمینه
  logo?: string; // لوگوی شرکت / حامی
  badge: string; // متن برچسب
  badgeColor?: 'amber' | 'emerald' | 'indigo' | 'rose' | 'violet' | 'cyan' | 'slate'; // رنگ برچسب
  phone: string; // تلفن تماس
  mobile?: string; // شماره همراه / واتساپ
  linkUrl?: string; // آدرس وب‌سایت یا کاتالوگ
  linkText?: string; // متن دکمه اقدام (CTA)
  themeColor?: 'dark' | 'navy' | 'emerald' | 'amber' | 'carbon'; // تم پس‌زمینه
  overlayOpacity?: 'light' | 'medium' | 'heavy'; // شدت گرادیان تیره روی تصویر
  status?: 'active' | 'inactive'; // وضعیت انتشار
  priority?: number; // اولویت نمایش (۱ بالاترین)
  placement?: 'hero_slider' | 'middle_section' | 'sidebar'; // جایگاه نمایش
  expiresAt?: string; // تاریخ انقضا
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  userId?: string | null;
  unitId?: string | null;
  action: 'login' | 'unit_created' | 'unit_updated' | 'status_changed' | 'product_added' | 'product_updated' | 'product_deleted' | 'classified_added' | 'quote_received' | 'review_added' | 'admin_note' | string;
  title: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  performedBy?: 'user' | 'admin' | 'system';
  createdAt: string;
}

export const CATEGORIES = [
  { id: "metals", name: "صنایع فلزی و ماشین‌سازی" },
  { id: "chemicals", name: "صنایع شیمیایی و پلاستیک" },
  { id: "wood_paper", name: "صنایع چوب، کاغذ و سلولزی" },
  { id: "food_pharma", name: "صنایع غذایی، دارویی و بهداشتی" },
  { id: "textiles", name: "صنایع نساجی و پوشاک" },
  { id: "electronics", name: "صنایع برق و الکترونیک" },
  { id: "materials", name: "کانی غیرفلزی و مصالح ساختمانی" },
  { id: "others", name: "سایر صنایع تولیدی" }
];

export interface SiteContent {
  // Hero Section
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroSearchPlaceholder: string;
  heroFeature1: string;
  heroFeature2: string;
  heroFeature3: string;
  
  // Section Headings
  unitsSectionTitle: string;
  unitsSectionSubtitle?: string;
  
  // Quick Announcement / Notice Bar on top of page
  announcementText?: string;
  announcementEnabled?: boolean;
  announcementType?: 'info' | 'warning' | 'success';

  // Footer Texts
  footerTitle: string;
  footerDescription: string;
  footerCopyright: string;
  footerContactText?: string;

  // Header / Brand Title & Subtitle
  headerTitle?: string;
  headerSubtitle?: string;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroBadge: "مرجع رسمی صنعتگران و تولیدکنندگان شهرک صنعتی",
  heroTitle: "بانک اطلاعات و محصولات واحدهای تولیدی",
  heroSubtitle: "به راحتی کارگاه‌ها و محصولات فعال در شهرک صنعتی را جستجو کنید. اگر صاحب کارگاه تولیدی هستید، با ایجاد حساب کاربری رایگان، اطلاعات و محصولات خود را برای عموم معرفی کنید.",
  heroSearchPlaceholder: "جستجوی نام کارگاه، خدمات یا محصولات...",
  heroFeature1: "اطلاعات تأیید شده",
  heroFeature2: "دسترسی مستقیم",
  heroFeature3: "معرفی کالا و خدمات",
  unitsSectionTitle: "واحدهای تولیدی شهرک صنعتی",
  unitsSectionSubtitle: "بانک اطلاعات جامع کارگاه‌ها و کارخانجات فعال",
  announcementText: "",
  announcementEnabled: false,
  announcementType: "info",
  footerTitle: "سامانه بانک اطلاعاتی آنلاین واحدهای تولیدی شهرک صنعتی",
  footerDescription: "این پلتفرم به صورت رایگان در جهت رونق کسب‌وکارهای تولیدی، تسهیل ارتباط مستقیم خریداران و تولیدکنندگان و نمایش توانمندی‌های بومی شهرک‌های صنعتی طراحی و پیاده‌سازی شده است.",
  footerCopyright: "Industrial Park Directory © 2026 - کلیه حقوق محفوظ است",
  footerContactText: "در صورت نیاز به پشتیبانی یا ثبت اطلاعات با مدیریت سامانه در ارتباط باشید.",
  headerTitle: "شهرک صنعتی",
  headerSubtitle: "بانک اطلاعات و محصولات واحدهای تولیدی",
};

// ==========================================
// 1. Industrial Machine Capacity Sharing (بازارگاه ظرفیت‌های خالی ماشین‌آلات)
// ==========================================
export interface IndustrialCapacity {
  id: string;
  unitId?: string;
  unitName: string;
  ownerId?: string;
  title: string; // عنوان آگهی ظرفیت خالی
  machineType: string; // نوع دستگاه یا خدمت (cnc_turning, laser_cutting, plastic_injection, ...)
  machineTypeName?: string; // نام فارسی دستگاه
  modelSpecs?: string; // مشخصات فنی و مدل دستگاه (مثلا: ۴ محوره، میز ۳ در ۱.۵، دقت ۰.۰۱)
  availableCapacity: string; // میزان ظرفیت خالی (مثلا: ۵۰ ساعت در هفته، شیفت شب)
  pricingType: "hourly" | "per_piece" | "negotiable" | "contract"; // نوع قیمت‌گذاری
  priceRate?: string; // نرخ یا مبلغ پیشنهادی (مثلا: ساعتی ۲,۰۰۰,۰۰۰ ریال)
  minOrder?: string; // حداقل سفارش
  contactPhone: string; // تلفن ثابت یا همراه
  contactPerson?: string; // مسئول فنی یا پذیرش سفارش
  workshopAddress?: string; // آدرس کارگاه در شهرک
  description: string; // توضیحات، متریال‌های قابل پردازش و شرایط پذیرش
  image?: string; // تصویر دستگاه یا نمونه‌کار
  status: "active" | "busy" | "inactive"; // فعال، در حال تکمیل ظرفیت، غیرفعال
  tags?: string[]; // برچسب‌های فنی (مانند: استیل، برنج، آلومینیوم، تیراژ بالا)
  createdAt: string;
  updatedAt?: string;
}

export const CAPACITY_MACHINE_TYPES = [
  { id: "all", name: "همه ماشین‌آلات و خدمات" },
  { id: "cnc_machining", name: "تراشکاری و فرزکاری CNC" },
  { id: "laser_cutting", name: "برش لیزر، پلاسما و واترجت" },
  { id: "plastic_injection", name: "تزریق پلاستیک و بادی" },
  { id: "press_bending", name: "خمکاری، برش و پرس صنعتی" },
  { id: "powder_coating", name: "خط رنگ پودری و الکترواستاتیک" },
  { id: "electroplating", name: "آبکاری و پوشش‌دهی فلزات" },
  { id: "welding_assembly", name: "جوشکاری تخصصی و مونتاژ سازه" },
  { id: "3d_printing", name: "چاپ سه‌بعدی و نمونه‌سازی سریع" },
  { id: "casting_molding", name: "ریخته‌گری و قالب‌سازی" },
  { id: "other_services", name: "سایر خدمات و ماشین‌آلات صنعتی" }
];

// ==========================================
// 2. Emergency and Outage Alerts (اعلانات اضطراری و قطعی‌های شهرک)
// ==========================================
export interface EmergencyAlert {
  id: string;
  title: string; // عنوان اعلان اضطراری (مثلاً: قطعی موقت برق فاز ۲)
  message: string; // متن کامل اعلان و توصیه‌های ایمنی
  type: "critical" | "warning" | "info" | "urgent"; // نوع اولویت (بحرانی، هشدار، اطلاع‌رسانی، فوری)
  category: "power" | "gas" | "water" | "weather" | "security" | "general"; // حوزه قطعی یا اعلان
  isActive: boolean; // فعال بودن جهت نمایش در صفحه اصلی
  affectedAreas?: string; // مناطق و فازهای تحت تاثیر (مانند: فاز ۱ و ۲ - خیابان‌های تلاش و صنعت)
  startDate?: string; // تاریخ و زمان شروع
  endDate?: string; // تاریخ و زمان پایان
  phoneContact?: string; // شماره تماس ستاد بحران یا اتفاقات
  priority?: number; // اولویت نمایش
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// 3. Official Verified Industrial Badges (نشان‌ها و بج‌های تاییدیه صنعتی)
// ==========================================
export interface IndustrialBadge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const OFFICIAL_BADGES: IndustrialBadge[] = [
  {
    id: "license_verified",
    name: "دارای پروانه بهره‌برداری",
    description: "پروانه رسمی بهره‌برداری از وزارت صمت استعلام و تایید گردیده است.",
    iconName: "ShieldCheck",
    color: "emerald",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/60",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-200 dark:border-emerald-800"
  },
  {
    id: "board_member",
    name: "عضو رسمی هیئت امنا",
    description: "مدیریت این واحد عضو رسمی هیئت امنای شهرک صنعتی می‌باشد.",
    iconName: "Landmark",
    color: "indigo",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/60",
    textColor: "text-indigo-700 dark:text-indigo-300",
    borderColor: "border-indigo-200 dark:border-indigo-800"
  },
  {
    id: "knowledge_based",
    name: "تولیدکننده دانش‌بنیان",
    description: "دارای گواهی رسمی شرکت دانش‌بنیان از معاونت علمی ریاست جمهوری.",
    iconName: "Sparkles",
    color: "violet",
    bgColor: "bg-purple-50 dark:bg-purple-950/60",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-200 dark:border-purple-800"
  },
  {
    id: "exemplary_unit",
    name: "واحد نمونه صنعتی",
    description: "برگزیده به عنوان واحد تولیدی نمونه و ممتاز سال شهرک صنعتی.",
    iconName: "Award",
    color: "amber",
    bgColor: "bg-amber-50 dark:bg-amber-950/60",
    textColor: "text-amber-800 dark:text-amber-300",
    borderColor: "border-amber-200 dark:border-amber-800"
  },
  {
    id: "national_standard",
    name: "دارای استاندارد ملی",
    description: "محصولات این کارگاه منطبق با استانداردهای ملی اجباری/تشویقی ایران می‌باشد.",
    iconName: "CheckCircle2",
    color: "teal",
    bgColor: "bg-teal-50 dark:bg-teal-950/60",
    textColor: "text-teal-700 dark:text-teal-300",
    borderColor: "border-teal-200 dark:border-teal-800"
  },
  {
    id: "top_exporter",
    name: "صادرکننده برتر",
    description: "دارای افتخار صادرات محصولات صنعتی به بازارهای منطقه‌ای و بین‌المللی.",
    iconName: "Globe",
    color: "blue",
    bgColor: "bg-blue-50 dark:bg-blue-950/60",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-800"
  }
];

