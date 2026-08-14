import React, { useState, useEffect } from "react";
import { MessageSquare, Star, CheckCircle, XCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "../../firebase";

interface Review {
  id: string;
  unitId: string;
  authorName: string;
  rating: number;
  comment: string;
  status: string; // 'pending', 'approved', 'rejected'
  createdAt: string;
}

interface ReviewManagerProps {
  unitId: string;
}

export default function ReviewManager({ unitId }: ReviewManagerProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [unitId]);

  const getHeaders = () => {
    const savedUser = localStorage.getItem("custom_auth_user");
    let tokenHeaders: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch (e) {}
    }
    return tokenHeaders;
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/units/${unitId}/reviews/all`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      } else {
        const error = await res.json();
        console.error(error);
        toast.error(error.error || "خطا در دریافت نظرات");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reviewId: string, status: string) => {
    try {
      const res = await fetch(`/api/units/${unitId}/reviews/${reviewId}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`وضعیت نظر بروز شد`);
        fetchReviews();
      } else {
        toast.error("خطا در بروزرسانی وضعیت");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور");
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!window.confirm("آیا از حذف این نظر اطمینان دارید؟")) return;
    
    try {
      const res = await fetch(`/api/units/${unitId}/reviews/${reviewId}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (res.ok) {
        toast.success("نظر با موفقیت حذف شد");
        fetchReviews();
      } else {
        toast.error("خطا در حذف نظر");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-500" />
          <span>مدیریت نظرات کاربران</span>
          {reviews.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {reviews.filter(r => r.status === 'pending').length} جدید
            </span>
          )}
        </h3>
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-sm">در حال دریافت...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
          هنوز نظری برای واحد شما ثبت نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-800">{rev.authorName}</span>
                    <span className="text-[10px] text-slate-400">{new Date(rev.createdAt).toLocaleDateString("fa-IR")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      rev.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      rev.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {rev.status === 'approved' ? 'تایید شده' : rev.status === 'rejected' ? 'رد شده' : 'در انتظار تایید'}
                    </span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-3 w-3 ${rev.rating >= star ? 'fill-amber-400' : 'text-slate-200 fill-slate-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                  {rev.comment}
                </p>
              </div>
              
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                {rev.status !== 'approved' && (
                  <button
                    onClick={() => updateStatus(rev.id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    تایید
                  </button>
                )}
                {rev.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(rev.id, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    رد
                  </button>
                )}
                <button
                  onClick={() => deleteReview(rev.id)}
                  className="flex items-center justify-center p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="حذف نظر"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
