CREATE TABLE "banners" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"badge" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classifieds" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"phone" text NOT NULL,
	"price" text,
	"location" text,
	"category" text NOT NULL,
	"image" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"phone" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"expires_at" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"price" text,
	"seo_keywords" text,
	"seo_description" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"quantity" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"provider" text NOT NULL,
	"template" text NOT NULL,
	"status" text NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"mobile1" text,
	"mobile2" text,
	"address" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"profile_image" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"map_url" text,
	"seo_keywords" text,
	"seo_description" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"uid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"created_at" text NOT NULL,
	"password_hash" text
);
