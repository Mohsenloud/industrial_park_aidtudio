export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
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
