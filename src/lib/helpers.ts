import { Product, Unit } from "../types";

export interface ClassifiedAd {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  type: "job" | "real_estate" | "classified";
  category: string;
  phone: string;
  price?: string;
  location?: string;
  image?: string;
  createdAt: string;
}

/**
 * Validates an Iranian mobile phone number.
 * Standard format: 09XXXXXXXXX (11 digits, starts with 09)
 */
export function isValidIranianMobile(phone: string): boolean {
  const clean = phone.trim();
  const regex = /^09\d{9}$/;
  return regex.test(clean);
}

/**
 * Validates an email address.
 */
export function isValidEmail(email: string): boolean {
  const clean = email.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(clean);
}

/**
 * Formats a date string, number, or Date object to Persian (fa-IR) date format.
 */
export function formatPersianDate(date: string | number | Date): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fa-IR");
  } catch (e) {
    return "";
  }
}

/**
 * Formats a date string, number, or Date object to Persian (fa-IR) date and time format.
 */
export function formatPersianDateTime(date: string | number | Date): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("fa-IR");
  } catch (e) {
    return "";
  }
}

/**
 * Filters and searches classified ads.
 */
export function filterAds(
  ads: ClassifiedAd[],
  activeFilter: string,
  searchQuery: string
): ClassifiedAd[] {
  return ads.filter((ad) => {
    if (activeFilter !== "all" && ad.type !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        ad.title.toLowerCase().includes(q) ||
        ad.description.toLowerCase().includes(q) ||
        ad.category.toLowerCase().includes(q) ||
        (ad.location && ad.location.toLowerCase().includes(q))
      );
    }
    return true;
  });
}

/**
 * Filters and searches products.
 */
export function filterProducts(
  products: Product[],
  units: Unit[],
  selectedCategory: string,
  searchQuery: string
): Product[] {
  const getProductUnit = (product: Product): Unit | undefined => {
    return units.find((u) => u.id === product.unitId);
  };

  return products.filter((product) => {
    const parentUnit = getProductUnit(product);

    // A. Category Filter (based on the unit's industrial sector)
    if (selectedCategory && (!parentUnit || parentUnit.category !== selectedCategory)) {
      return false;
    }

    // B. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();

      const matchName = product.name.toLowerCase().includes(q);
      const matchDesc = product.description && product.description.toLowerCase().includes(q);
      const matchKeywords = product.seoKeywords && product.seoKeywords.toLowerCase().includes(q);
      const matchUnitName = parentUnit && parentUnit.name.toLowerCase().includes(q);

      return matchName || matchDesc || matchKeywords || matchUnitName;
    }

    return true;
  });
}

/**
 * Formats any continuous sequence of English or Persian/Arabic digits with thousand separators.
 * Preserves other characters like currency names, text, and punctuation.
 */
export function formatPrice(price: string | number | undefined): string {
  if (price === undefined || price === null) return "";
  const str = String(price).trim();
  if (!str) return "";

  // Remove existing commas to avoid double-formatting
  const cleaned = str.replace(/,/g, "");

  // Match any contiguous sequence of English, Persian, or Arabic digits and format them
  return cleaned.replace(/[0-9\u06f0-\u06f9\u0660-\u0669]+/g, (match) => {
    let result = "";
    let count = 0;
    for (let i = match.length - 1; i >= 0; i--) {
      if (count > 0 && count % 3 === 0) {
        result = "," + result;
      }
      result = match[i] + result;
      count++;
    }
    return result;
  });
}
