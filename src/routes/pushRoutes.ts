import { Router } from "express";
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  sendTestPush,
  getSubscriptionStats,
  broadcastPush
} from "../services/pushNotificationService.ts";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";

export const pushRouter = Router();

// Get VAPID Public Key for client subscription
pushRouter.get("/push/vapid-public-key", (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    return res.json({ publicKey });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Subscribe client device to Web Push
pushRouter.post("/push/subscribe", async (req: AuthRequest, res) => {
  try {
    const { subscription, userId } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "اطلاعات اشتراک اعلان نامعتبر است." });
    }

    const effectiveUserId = req.user?.uid || userId || null;
    const userAgent = req.headers["user-agent"] || null;

    const record = await saveSubscription(subscription, effectiveUserId, userAgent);
    return res.json({ success: true, id: record.id });
  } catch (err: any) {
    console.error("Push subscribe error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Unsubscribe client device
pushRouter.post("/push/unsubscribe", async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "آدرس اشتراک الزامی است." });
    }

    await removeSubscription(endpoint);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Send a test notification to verify client setup
pushRouter.post("/push/test", async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "اطلاعات اشتراک برای تست ارسال نشده است." });
    }

    const result = await sendTestPush(subscription);
    if (!result.success) {
      return res.status(500).json({ error: result.error || "ارسال ناموفق بود" });
    }

    return res.json({ success: true, message: "اعلان آزمایشی ارسال شد." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Push notification statistics (For Admin / System Health)
pushRouter.get("/push/stats", async (req, res) => {
  try {
    const stats = await getSubscriptionStats();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
