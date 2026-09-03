import { Router } from "express";
import { db } from "../db/index.ts";
import { quotes, units } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { sendPushToUser } from "../services/pushNotificationService.ts";

export const quoteRouter = Router();

// Get quotes for a specific workshop (owner or admin only)
quoteRouter.get("/quotes/unit/:unitId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { unitId } = req.params;
    const requesterId = req.user!.uid;

    // Verify unit ownership
    const unitResult = await db.select().from(units).where(eq(units.id, unitId));
    if (unitResult.length === 0) {
      return res.status(404).json({ error: "واحد صنعتی یافت نشد." });
    }

    const unit = unitResult[0];
    const isOwner = unit.ownerId === requesterId;

    if (!isOwner && req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "سطح دسترسی ناکافی به استعلام‌های این واحد." });
    }

    const result = await db.select().from(quotes).where(eq(quotes.unitId, unitId));
    return res.json(result);
  } catch (err: any) {
    console.error("Error fetching quotes for unit:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Submit a new quote request (RFQ)
quoteRouter.post("/quotes", async (req, res) => {
  try {
    const data = req.body;
    if (!data.productId || !data.unitId || !data.buyerName || !data.buyerPhone || !data.quantity) {
      return res.status(400).json({ error: "ورود تمامی فیلدهای الزامی برای استعلام الزامی است." });
    }

    const newQuote = {
      id: `qot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: data.productId,
      unitId: data.unitId,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      quantity: data.quantity,
      description: data.description || "",
      status: "pending",
      createdAt: new Date().toISOString()
    };

    const result = await db.insert(quotes).values(newQuote).returning();
    const createdQuote = result[0];

    // Trigger instant Web Push Notification to workshop owner
    try {
      const unitResult = await db.select().from(units).where(eq(units.id, data.unitId));
      if (unitResult.length > 0 && unitResult[0].ownerId) {
        const ownerId = unitResult[0].ownerId;
        await sendPushToUser(ownerId, {
          title: "📩 استعلام قیمت جدید دریافت شد",
          body: `مشتری «${data.buyerName}» برای کارگاه شما استعلام قیمت ثبت کرد (تعداد: ${data.quantity}).`,
          url: "/app/dashboard?tab=quotes",
          tag: `quote_${createdQuote.id}`
        });
      }
    } catch (pushErr: any) {
      console.warn("[Quote Notification Notice] Could not dispatch push:", pushErr.message);
    }

    return res.json(createdQuote);
  } catch (err: any) {
    console.error("Error submitting quote:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Update quote status (approved, rejected, fulfilled)
quoteRouter.post("/quotes/:id/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const requesterId = req.user!.uid;

    const existing = await db.select().from(quotes).where(eq(quotes.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: "درخواست استعلام یافت نشد." });
    }

    const unitResult = await db.select().from(units).where(eq(units.id, existing[0].unitId));
    if (unitResult.length === 0) {
      return res.status(404).json({ error: "واحد صنعتی متناظر یافت نشد." });
    }

    const isOwner = unitResult[0].ownerId === requesterId;
    if (!isOwner && req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "شما مجاز به تغییر وضعیت این استعلام نیستید." });
    }

    const result = await db.update(quotes)
      .set({ status })
      .where(eq(quotes.id, id))
      .returning();

    return res.json(result[0]);
  } catch (err: any) {
    console.error("Error updating quote status:", err);
    return res.status(500).json({ error: err.message });
  }
});
