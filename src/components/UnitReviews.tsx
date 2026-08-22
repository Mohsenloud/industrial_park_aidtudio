import React, { useState, useEffect } from "react";
import { Star, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

interface Review {
  id: string;
  unitId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface UnitReviewsProps {
  unitId: string;
}

export default function UnitReviews({ unitId }: UnitReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (unitId) {
      fetchReviews();
    } else {
      setLoading(false);
      setReviews([]);
    }
  }, [unitId]);

  const fetchReviews = async () => {
    if (!unitId) return;
    try {
      const res = await fetch(`/api/units/${unitId}/reviews`);
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setReviews(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch reviews", res.status);
      }
    } catch (err) {
      console.error("Error fetching reviews", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim() || !rating) {
      toast.error("لطفا تمامی فیلدها را پر کنید.");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/units/${unitId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, rating, comment })
      });
      
      if (!res.ok) {
        let errorMsg = "خطا در ثبت نظر";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await res.json();
            errorMsg = error.error || errorMsg;
          } else {
            const text = await res.text();
            console.error("Server returned non-JSON error:", text);
          }
        } catch (e) {
          console.error("Failed to parse error response", e);
        }
        throw new Error(errorMsg);
      }
      
      toast.success("نظر شما با موفقیت ثبت شد");
      setAuthorName("");
      setComment("");
      setRating(5);
      fetchReviews();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-6">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-500" />
          <span>نظرات و امتیازات</span>
        </h3>
        
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl">
            <span className="font-bold text-indigo-700">{averageRating}</span>
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="text-xs text-indigo-600 font-medium">
              (از {reviews.length} نظر)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <h4 className="font-bold text-slate-700 mb-4 text-sm">ثبت نظر جدید</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نام شما
              </label>
              <input
                type="text"
                required
                placeholder="مثلاً علی رضایی"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                امتیاز شما (۱ تا ۵)
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer hover:scale-110 transition-transform"
                  >
                    <Star 
                      className={`h-6 w-6 ${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                متن نظر
              </label>
              <textarea
                required
                placeholder="تجربه خود از کار با این کارگاه را بنویسید..."
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 min-h-[100px] resize-y"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-200 disabled:opacity-50 cursor-pointer text-sm"
            >
              {submitting ? "در حال ثبت..." : "ثبت نظر"}
            </button>
          </form>
        </div>

        {/* Reviews List */}
        <div>
          <h4 className="font-bold text-slate-700 mb-4 text-sm border-b border-slate-100 pb-2">نظرات کاربران</h4>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center text-sm text-slate-400 py-6">در حال دریافت...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center text-sm text-slate-400 py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                هنوز نظری برای این واحد ثبت نشده است.<br/>شما اولین نفر باشید!
              </div>
            ) : (
              reviews.map((rev, idx) => (
                <div key={`${rev.id}-${idx}`} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm text-slate-800">{rev.authorName}</div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-3 w-3 ${rev.rating >= star ? 'fill-amber-400' : 'text-slate-200 fill-slate-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rev.comment}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 text-right">
                    {new Date(rev.createdAt).toLocaleDateString("fa-IR")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
