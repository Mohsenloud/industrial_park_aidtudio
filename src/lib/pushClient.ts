// Helper for Web Push Notifications on Client
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

export async function checkPushSupportAndStatus(): Promise<PushStatus> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return {
      isSupported: false,
      permission: "default",
      isSubscribed: false,
      subscription: null
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = registration ? await registration.pushManager.getSubscription() : null;

    return {
      isSupported: true,
      permission: Notification.permission,
      isSubscribed: !!sub,
      subscription: sub
    };
  } catch (err) {
    return {
      isSupported: true,
      permission: Notification.permission,
      isSubscribed: false,
      subscription: null
    };
  }
}

/**
 * Register Service Worker and subscribe to Web Push
 */
export async function subscribeToWebPush(userId?: string): Promise<{ success: boolean; message?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("مرورگر شما از سیستم اعلان‌های وب (Web Push) پشتیبانی نمی‌کند.");
  }

  // 1. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("دسترسی ارسال اعلان توسط شما تایید نشد.");
  }

  // 2. Register Service Worker
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  // 3. Fetch VAPID public key from backend
  const keyRes = await fetch("/api/push/vapid-public-key");
  if (!keyRes.ok) {
    throw new Error("دریافت کلید ارتباطی اعلان از سرور ناموفق بود.");
  }
  const { publicKey } = await keyRes.json();
  if (!publicKey) {
    throw new Error("کلید VAPID سرور نامعتبر است.");
  }

  const applicationServerKey = urlBase64ToUint8Array(publicKey);

  // 4. Subscribe with PushManager
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  }

  // 5. Send subscription to server
  const subJson = subscription.toJSON();
  const subRes = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subJson,
      userId
    })
  });

  if (!subRes.ok) {
    throw new Error("ثبت دستگاه در پایگاه داده سرور با خطا مواجه شد.");
  }

  return { success: true, message: "دستگاه شما با موفقیت جهت دریافت اعلان‌های فوری ثبت شد." };
}

/**
 * Send test push notification
 */
export async function sendTestNotification(): Promise<boolean> {
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (!sub) {
    throw new Error("ابتدا باید اشتراک اعلان را فعال کنید.");
  }

  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() })
  });

  return res.ok;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromWebPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error("Error unsubscribing:", err);
    return false;
  }
}
