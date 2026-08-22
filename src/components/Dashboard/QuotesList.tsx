import React, { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Product } from "../../types";

interface QuotesListProps {
  unitId: string;
  products: Product[];
}

export default function QuotesList({ unitId, products }: QuotesListProps) {
  const [receivedQuotes, setReceivedQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  const getHeaders = () => {
    const savedUser = localStorage.getItem("custom_auth_user");
    let tokenHeaders: Record<string, string> = {};
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed) {
        const token = parsed.token;
        if (token) {
          tokenHeaders["Authorization"] = `Bearer ${token}`;
        }
      }
    }
    return tokenHeaders;
  };

  const fetchReceivedQuotes = async () => {
    if (!unitId) return;
    try {
      setQuotesLoading(true);
      const res = await fetch(`/api/quotes/unit/${unitId}`, { 
        headers: getHeaders() 
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReceivedQuotes(sorted);
      }
    } catch (err) {
      console.error("Error fetching received quotes:", err);
    } finally {
      setQuotesLoading(false);
    }
  };

  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      const headers = {
        ...getHeaders(),
        "Content-Type": "application/json"
      };
      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setReceivedQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
      } else {
        toast.error("خطا در تغییر وضعیت استعلام.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور.");
    }
  };

  useEffect(() => {
    if (unitId) {
      fetchReceivedQuotes();
    }
  }, [unitId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          <h3 className="font-extrabold text-lg text-slate-800">استعلام‌های قیمت دریافتی (RFQs)</h3>
        </div>
        <button
          onClick={fetchReceivedQuotes}
          disabled={quotesLoading}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl hover:shadow-sm transition-all cursor-pointer"
          title="بروزرسانی استعلام‌ها"
        >
          <RefreshCw className={`h-4 w-4 ${quotesLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {quotesLoading ? (
        <div className="flex justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="text-xs">در حال بارگذاری استعلام‌های قیمت...</span>
        </div>
      ) : receivedQuotes.length === 0 ? (
        <div className="text-center text-slate-400 py-10">
          <MessageSquare className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-500">هیچ درخواست استعلام قیمتی دریافت نشده است</p>
          <p className="text-xs text-slate-400 mt-1">
            خریداران می‌توانند از طریق دکمه «استعلام سریع قیمت» در صفحه کالاها، مستقیماً برای کارگاه شما درخواست بفرستند.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {receivedQuotes.map((quote, index) => {
            const prod = products.find(p => p.id === quote.productId);
            return (
              <div
                key={`${quote.id}-${index}`}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 hover:border-indigo-100 hover:shadow-sm transition-all space-y-4 text-right"
                style={{ direction: "rtl" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-indigo-900">
                        {quote.buyerName}
                      </span>
                      <a
                        href={`tel:${quote.buyerPhone}`}
                        className="font-mono text-xs text-slate-500 font-bold hover:text-indigo-600 underline"
                      >
                        {quote.buyerPhone}
                      </a>
                    </div>
                    <p className="text-xs text-slate-400">
                      استعلام برای محصول:{" "}
                      <span className="font-extrabold text-slate-700">
                        {prod ? prod.name : "کالای نامشخص (حذف شده)"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badges */}
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border ${
                      quote.status === "pending"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : quote.status === "replied"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {quote.status === "pending" && "در انتظار پاسخ"}
                      {quote.status === "replied" && "پاسخ داده شده"}
                      {quote.status === "cancelled" && "بایگانی شده"}
                    </span>

                    {/* Status Actions */}
                    <div className="flex gap-1.5">
                      {quote.status === "pending" && (
                        <button
                          onClick={() => handleUpdateQuoteStatus(quote.id, "replied")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all"
                        >
                          علامت‌گذاری به عنوان پاسخ‌داده‌شده
                        </button>
                      )}
                      {quote.status !== "cancelled" && (
                        <button
                          onClick={() => handleUpdateQuoteStatus(quote.id, "cancelled")}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black cursor-pointer transition-all"
                        >
                          بایگانی درخواست
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description / Tech Specifications */}
                <div className="p-4 bg-white rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed space-y-2">
                  <p className="font-bold text-slate-700">تعداد درخواستی: <span className="font-extrabold text-indigo-600">{quote.quantity}</span></p>
                  <p className="whitespace-pre-line text-slate-500">{quote.description || "توضیحات تکمیلی یا مشخصات فنی اختصاصی ارائه نشده است."}</p>
                </div>

                <div className="text-[9px] text-slate-400 font-mono text-right">
                  تاریخ ثبت درخواست: {new Date(quote.createdAt).toLocaleString("fa-IR")}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
