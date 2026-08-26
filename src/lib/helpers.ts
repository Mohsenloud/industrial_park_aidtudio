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
 * Parses numeric price from string containing numbers, Persian/Arabic digits, or formatted strings.
 */
export function parseNumericPrice(priceStr: string | number | undefined): number | null {
  if (priceStr === undefined || priceStr === null) return null;
  const str = String(priceStr).trim();
  if (!str) return null;
  
  // Convert Persian/Arabic digits to English digits
  const normalized = str
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/,/g, '')
    .replace(/\s+/g, '');

  const match = normalized.match(/\d+(\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Filters and searches products.
 */
export function filterProducts(
  products: Product[],
  units: Unit[],
  selectedCategory: string,
  searchQuery: string,
  minPrice?: number | null,
  maxPrice?: number | null,
  onlyWithPrice?: boolean,
  sortBy?: "newest" | "price_asc" | "price_desc" | "name"
): Product[] {
  const getProductUnit = (product: Product): Unit | undefined => {
    return units.find((u) => u.id === product.unitId);
  };

  const filtered = products.filter((product) => {
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

      if (!matchName && !matchDesc && !matchKeywords && !matchUnitName) {
        return false;
      }
    }

    // C. Price Filter
    const numericPrice = parseNumericPrice(product.price);

    // Only with price
    if (onlyWithPrice && (numericPrice === null || numericPrice <= 0)) {
      return false;
    }

    // Min Price
    if (minPrice !== undefined && minPrice !== null && minPrice > 0) {
      if (numericPrice === null || numericPrice < minPrice) {
        return false;
      }
    }

    // Max Price
    if (maxPrice !== undefined && maxPrice !== null && maxPrice > 0) {
      if (numericPrice === null || numericPrice > maxPrice) {
        return false;
      }
    }

    return true;
  });

  // Sort results if specified
  if (sortBy) {
    return filtered.sort((a, b) => {
      if (sortBy === "price_asc") {
        const priceA = parseNumericPrice(a.price) ?? Infinity;
        const priceB = parseNumericPrice(b.price) ?? Infinity;
        return priceA - priceB;
      }
      if (sortBy === "price_desc") {
        const priceA = parseNumericPrice(a.price) ?? -Infinity;
        const priceB = parseNumericPrice(b.price) ?? -Infinity;
        return priceB - priceA;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "fa");
      }
      // "newest" by default
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  return filtered;
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
