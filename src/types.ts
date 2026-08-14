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
  description: string;
  image: string;
  badge: string;
  phone: string;
  createdAt?: string;
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
