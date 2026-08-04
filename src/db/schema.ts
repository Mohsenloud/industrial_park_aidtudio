import { pgTable, text, doublePrecision } from "drizzle-orm/pg-core";

// Users table (maps Firebase UID to other profile details)
export const users = pgTable("users", {
  uid: text("uid").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull(),
  passwordHash: text("password_hash"),
  lastLoginAt: text("last_login_at"),
});

// Units table (stores workshops/manufacturing units)
export const units = pgTable("units", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(), // تلفن ثابت
  mobile1: text("mobile1"), // شماره موبایل ۱
  mobile2: text("mobile2"), // شماره موبایل ۲
  address: text("address").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  profileImage: text("profile_image").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  mapUrl: text("map_url"),
  seoKeywords: text("seo_keywords"),
  seoDescription: text("seo_description"),
  email: text("email"),
  website: text("website"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Products table (stores products of the units)
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  price: text("price"),
  seoKeywords: text("seo_keywords"),
  seoDescription: text("seo_description"),
  createdAt: text("created_at").notNull(),
});

// Banners table (stores promotional ad banners)
export const banners = pgTable("banners", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  badge: text("badge").notNull(),
  phone: text("phone").notNull(),
  createdAt: text("created_at").notNull(),
});

// Settings table (stores dynamic configurations such as SMS gateways)
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Classifieds table (Classifieds, Job Board & Industrial Real Estate)
export const classifieds = pgTable("classifieds", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  type: text("type").notNull(), // 'job' | 'real_estate' | 'classified'
  title: text("title").notNull(),
  description: text("description").notNull(),
  phone: text("phone").notNull(),
  price: text("price"), // Also serves as salary for jobs
  location: text("location"),
  category: text("category").notNull(),
  image: text("image"),
  createdAt: text("created_at").notNull(),
});

// Quotes table (Request for Quote)
export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  unitId: text("unit_id").notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  quantity: text("quantity").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(), // 'pending' | 'replied' | 'cancelled'
  createdAt: text("created_at").notNull(),
});

// OTP codes table (persists active OTP codes for verification)
export const otps = pgTable("otps", {
  phone: text("phone").primaryKey(),
  code: text("code").notNull(),
  expiresAt: doublePrecision("expires_at").notNull(),
});

// SMS Logs table (stores a history of sent SMS messages/OTPs)
export const smsLogs = pgTable("sms_logs", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  provider: text("provider").notNull(),
  template: text("template").notNull(),
  status: text("status").notNull(),
  timestamp: text("timestamp").notNull(),
});



