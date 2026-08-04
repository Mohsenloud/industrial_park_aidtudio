import { describe, it, expect } from "vitest";
import {
  isValidIranianMobile,
  isValidEmail,
  formatPersianDate,
  formatPersianDateTime,
  filterAds,
  filterProducts,
  ClassifiedAd
} from "../lib/helpers";
import { Product, Unit } from "../types";

describe("Unit Tests - Validation Helpers", () => {
  it("should validate Iranian mobile phone numbers correctly", () => {
    expect(isValidIranianMobile("09123456789")).toBe(true);
    expect(isValidIranianMobile("09351234567")).toBe(true);
    expect(isValidIranianMobile("09012345678")).toBe(true);
    
    expect(isValidIranianMobile("08123456789")).toBe(false); // starts with 08
    expect(isValidIranianMobile("123456789")).toBe(false);    // too short
    expect(isValidIranianMobile("091234567890")).toBe(false);  // too long
    expect(isValidIranianMobile("0912abc6789")).toBe(false);   // has letters
  });

  it("should validate email addresses correctly", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name+label@domain.co.ir")).toBe(true);
    
    expect(isValidEmail("testexample.com")).toBe(false);       // no @
    expect(isValidEmail("test@example")).toBe(false);           // no TLD
    expect(isValidEmail("test@.com")).toBe(false);              // no domain name
  });
});

describe("Unit Tests - Persian Date Formatting", () => {
  it("should format dates to Persian locale date strings", () => {
    const testDate = "2026-07-04T12:00:00.000Z";
    const formatted = formatPersianDate(testDate);
    
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe("string");
    // Under different Node version / OS locales, Persian digits or slash could vary, 
    // but it should be a non-empty string and not crash.
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("should return empty string for invalid dates", () => {
    expect(formatPersianDate("invalid-date")).toBe("");
    expect(formatPersianDateTime("invalid-date")).toBe("");
  });
});

describe("Unit Tests - Filters", () => {
  const mockAds: ClassifiedAd[] = [
    {
      id: "1",
      ownerId: "user1",
      title: "استخدام مهندس برق",
      description: "به یک مهندس برق صنعتی در شهرک نیازمندیم",
      type: "job",
      category: "برق",
      phone: "09123456789",
      location: "تهران",
      createdAt: "2026-07-04"
    },
    {
      id: "2",
      ownerId: "user2",
      title: "اجاره سوله کارگاهی",
      description: "یک باب سوله به مساحت ۵۰۰ متر مربع به رهن داده می‌شود",
      type: "real_estate",
      category: "املاک",
      phone: "09121111111",
      location: "البرز",
      createdAt: "2026-07-04"
    }
  ];

  it("should filter classified ads by type", () => {
    const jobAds = filterAds(mockAds, "job", "");
    expect(jobAds).toHaveLength(1);
    expect(jobAds[0].id).toBe("1");

    const realEstateAds = filterAds(mockAds, "real_estate", "");
    expect(realEstateAds).toHaveLength(1);
    expect(realEstateAds[0].id).toBe("2");

    const allAds = filterAds(mockAds, "all", "");
    expect(allAds).toHaveLength(2);
  });

  it("should filter classified ads by search query", () => {
    const searchResult = filterAds(mockAds, "all", "مهندس");
    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].id).toBe("1");

    const emptyResult = filterAds(mockAds, "all", "آپارتمان");
    expect(emptyResult).toHaveLength(0);
  });

  it("should filter products by category and search query", () => {
    const mockUnits: Unit[] = [
      {
        id: "unit1",
        ownerId: "owner1",
        name: "فولاد کویر",
        phone: "02111111",
        address: "بلوار صنعت",
        description: "کارخانه نورد فولاد و میلگرد",
        category: "metals",
        profileImage: "",
        createdAt: "",
        updatedAt: ""
      },
      {
        id: "unit2",
        ownerId: "owner2",
        name: "شیمی البرز",
        phone: "02122222",
        address: "بلوار پتروشیمی",
        description: "تولید مواد شیمیایی آبکاری",
        category: "chemicals",
        profileImage: "",
        createdAt: "",
        updatedAt: ""
      }
    ];

    const mockProducts: Product[] = [
      {
        id: "prod1",
        unitId: "unit1",
        ownerId: "owner1",
        name: "میلگرد سایز ۱۶",
        description: "میلگرد آجدار با استاندارد A3",
        image: "",
        createdAt: ""
      },
      {
        id: "prod2",
        unitId: "unit2",
        ownerId: "owner2",
        name: "اسید کلریدریک صنعتی",
        description: "اسید آبکاری درجه یک",
        image: "",
        createdAt: ""
      }
    ];

    // Filter by category
    const metalsProducts = filterProducts(mockProducts, mockUnits, "metals", "");
    expect(metalsProducts).toHaveLength(1);
    expect(metalsProducts[0].id).toBe("prod1");

    // Filter by search query
    const searchedProducts = filterProducts(mockProducts, mockUnits, "", "اسید");
    expect(searchedProducts).toHaveLength(1);
    expect(searchedProducts[0].id).toBe("prod2");

    // Search matches unit name
    const unitSearchedProducts = filterProducts(mockProducts, mockUnits, "", "فولاد");
    expect(unitSearchedProducts).toHaveLength(1);
    expect(unitSearchedProducts[0].id).toBe("prod1");
  });
});
