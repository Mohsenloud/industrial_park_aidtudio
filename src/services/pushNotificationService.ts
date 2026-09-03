import webpush from "web-push";
import { db } from "../db/index.ts";
import { pushSubscriptions } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}

export interface ClientSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface StoredSubscription {
  id: string;
  userId?: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  createdAt: string;
}

// In-memory cache for ultra-fast lookup and fallback
const subscriptionsMemory = new Map<string, StoredSubscription>();
let isSubscriptionsLoaded = false;

// Manage VAPID Keys
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:manamalat@gmail.com";

if (!vapidPublicKey || !vapidPrivateKey) {
  // Generate consistent ephemeral keys if not set in environment
  const generated = webpush.generateVAPIDKeys();
  vapidPublicKey = generated.publicKey;
  vapidPrivateKey = generated.privateKey;
  console.log("ℹ️ [Web Push] Generated ephemeral VAPID keys for this instance. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env for permanent persistence.");
}

try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (vapidErr) {
  console.error("Failed to initialize VAPID details:", vapidErr);
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

async function ensureSubscriptionsLoaded() {
  if (isSubscriptionsLoaded) return;
  try {
    const list = await db.select().from(pushSubscriptions);
    for (const sub of list) {
      subscriptionsMemory.set(sub.endpoint, sub);
    }
    isSubscriptionsLoaded = true;
  } catch (err: any) {
    console.warn("[Web Push Notice] DB subscription load failed, using memory:", err.message);
    isSubscriptionsLoaded = true;
  }
}

/**
 * Register or update a Web Push subscription
 */
export async function saveSubscription(
  sub: ClientSubscription,
  userId?: string | null,
  userAgent?: string | null
): Promise<StoredSubscription> {
  await ensureSubscriptionsLoaded();

  const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const record: StoredSubscription = {
    id,
    userId: userId || null,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent: userAgent || null,
    createdAt: new Date().toISOString()
  };

  subscriptionsMemory.set(sub.endpoint, record);

  try {
    await db.insert(pushSubscriptions)
      .values(record)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: record.userId,
          p256dh: record.p256dh,
          auth: record.auth,
          userAgent: record.userAgent,
          createdAt: record.createdAt
        }
      });
  } catch (dbErr: any) {
    console.warn("[Web Push Notice] DB insert failed, subscription cached in memory:", dbErr.message);
  }

  return record;
}

/**
 * Unsubscribe / remove an endpoint
 */
export async function removeSubscription(endpoint: string): Promise<boolean> {
  subscriptionsMemory.delete(endpoint);
  try {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Send notification to a specific subscription endpoint
 */
async function dispatchPush(sub: StoredSubscription, payload: PushPayload): Promise<boolean> {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth
    }
  };

  const notificationData = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon.svg",
    badge: payload.badge || "/icon.svg",
    url: payload.url || "/",
    tag: payload.tag || "general",
    data: payload.data || {}
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationData);
    return true;
  } catch (err: any) {
    // 404 or 410 means subscription has expired or unsubscribed
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`[Web Push] Subscription expired (${err.statusCode}), pruning ${sub.endpoint.slice(0, 35)}...`);
      await removeSubscription(sub.endpoint);
    } else {
      console.warn("[Web Push Send Error]:", err.message);
    }
    return false;
  }
}

/**
 * Send notification to all registered devices of a given user
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  await ensureSubscriptionsLoaded();
  let sentCount = 0;

  for (const sub of subscriptionsMemory.values()) {
    if (sub.userId === userId) {
      const ok = await dispatchPush(sub, payload);
      if (ok) sentCount++;
    }
  }

  return sentCount;
}

/**
 * Broadcast notification to all active devices
 */
export async function broadcastPush(payload: PushPayload): Promise<number> {
  await ensureSubscriptionsLoaded();
  let sentCount = 0;

  for (const sub of subscriptionsMemory.values()) {
    const ok = await dispatchPush(sub, payload);
    if (ok) sentCount++;
  }

  return sentCount;
}

/**
 * Send an immediate test notification to a specific endpoint
 */
export async function sendTestPush(sub: ClientSubscription): Promise<{ success: boolean; error?: string }> {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth
    }
  };

  const notificationData = JSON.stringify({
    title: "سامانه هوشمند شهرک صنعتی البرز",
    body: "سیستم اعلان‌های وب با موفقیت فعال شد! من‌بعد پیام‌ها و استعلام‌ها را آنی دریافت خواهید کرد.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    url: "/",
    tag: "test_notification"
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationData);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get count of active subscriptions
 */
export async function getSubscriptionStats() {
  await ensureSubscriptionsLoaded();
  return {
    totalSubscriptions: subscriptionsMemory.size,
    vapidConfigured: !!process.env.VAPID_PUBLIC_KEY
  };
}
