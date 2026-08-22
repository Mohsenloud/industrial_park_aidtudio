import React, { useState, useEffect, useRef } from "react";
import { 
  Briefcase, 
  MapPin, 
  Phone, 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Loader2, 
  Building2, 
  Tag, 
  Layers, 
  ImageIcon, 
  DollarSign, 
  Info,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CustomUser } from "../lib/customAuth";
import { UserProfile } from "../types";
import { compressImage } from "../lib/imageCompression";
import { filterAds, ClassifiedAd, formatPrice } from "../lib/helpers";
import { ClassifiedGridSkeleton } from "./Skeleton";
import toast from "react-hot-toast";

interface ClassifiedsProps {
  user: CustomUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  onOpenAuth: () => void;
}

const CLASSIFIED_CATEGORIES = {
  job: [
    "جوشکار و تراشکار",
    "اپراتور دستگاه CNC",
    "مهندس صنایع/مکانیک/برق",
    "حسابدار و اداری",
    "انباردار و تدارکات",
    "کارگر ساده و فنی",
    "سایر تخصص‌ها"
  ],
  real_estate: [
    "رهن و اجاره سوله",
    "خرید و فروش سوله/کارخانه",
    "واگذاری کارگاه فعال",
    "زمین صنعتی",
    "دفتر اداری و تجاری",
    "سایر موارد املاک"
  ],
  classified: [
    "ماشین‌آلات تولیدی",
    "تجهیزات کارگاهی",
    "مواد اولیه صنعتی",
    "ابزارآلات صنعتی",
    "ضایعات و بازیافت",
    "سایر ملزومات"
  ]
};

export default function Classifieds({ user, profile, isAdmin, onOpenAuth }: ClassifiedsProps) {
  const [ads, setAds] = useState<ClassifiedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "job" | "real_estate" | "classified">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [adsPage, setAdsPage] = useState(1);

  useEffect(() => {
    setAdsPage(1);
  }, [activeFilter, searchQuery]);
  
  // Create Ad Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [type, setType] = useState<"job" | "real_estate" | "classified">("job");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [adToDelete, setAdToDelete] = useState<ClassifiedAd | null>(null);
  const [isDeletingAd, setIsDeletingAd] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  // Update default phone when profile loads
  useEffect(() => {
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
  }, [profile]);

  // Handle Type Change to auto-select first category in that type
  useEffect(() => {
    setCategory(CLASSIFIED_CATEGORIES[type][0]);
  }, [type]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/classifieds");
      if (res.ok) {
        const data = await res.json();
        // Sort descending by creation date
        const sorted = (data || []).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAds(sorted);
      }
    } catch (err) {
      console.error("Error fetching classifieds:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setImageUploading(true);

    const MAX_SIZE = 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE) {
      setUploadError("حجم فایل انتخاب شده بیش از حد مجاز (۱ مگابایت) است.");
      toast.error("حجم تصویر آگهی نباید بیشتر از ۱ مگابایت باشد.");
      setImageUploading(false);
      if (e.target) e.target.value = "";
      return;
    }

    try {
      // Compress image client-side first
      const compressedFile = await compressImage(file);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = async () => {
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: reader.result, fileName: file.name })
          });
          const data = await response.json();
          if (response.ok && data.url) {
            setImage(data.url);
          } else {
            throw new Error(data.error || "آپلود ناموفق بود");
          }
        } catch (innerErr: any) {
          console.error(innerErr);
          setUploadError("خطا در ذخیره‌سازی تصویر در سرور.");
        } finally {
          setImageUploading(false);
        }
      };
    } catch (err) {
      console.error(err);
      setUploadError("خطا در پردازش و خواندن فایل تصویر.");
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !phone.trim() || !description.trim()) {
      toast.error("لطفاً تمامی فیلدهای الزامی را پر کنید.");
      return;
    }

    setSubmitting(true);
    const savedUser = localStorage.getItem("custom_auth_user");
    let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed) {
        const token = parsed.token;
        if (token) {
          tokenHeaders["Authorization"] = `Bearer ${token}`;
        }
      }
    }

    const payload = {
      type,
      title: title.trim(),
      category,
      price: price.trim(),
      location: location.trim(),
      phone: phone.trim(),
      description: description.trim(),
      image: image || null,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/classifieds", {
        method: "POST",
        headers: tokenHeaders,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("آگهی شما با موفقیت ثبت و منتشر شد.");
        setIsModalOpen(false);
        // Reset form
        setTitle("");
        setPrice("");
        setLocation("");
        setDescription("");
        setImage("");
        fetchAds();
      } else {
        const err = await res.json().catch(() => ({ error: "خطا در ثبت آگهی." }));
        toast.error(err.error || "خطا در ثبت آگهی.");
      }
    } catch (err) {
      console.error("Error submitting classified:", err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteDeleteAd = async () => {
    if (!adToDelete) return;
    setIsDeletingAd(true);

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

    try {
      const res = await fetch(`/api/classifieds/${adToDelete.id}`, {
        method: "DELETE",
        headers: tokenHeaders
      });

      if (res.ok) {
        toast.success("آگهی با موفقیت حذف شد.");
        setAdToDelete(null);
        fetchAds();
      } else {
        toast.error("خطا در حذف آگهی. دسترسی محدود است.");
      }
    } catch (err) {
      console.error("Error deleting classified:", err);
      toast.error("خطا در ارتباط با سرور.");
    } finally {
      setIsDeletingAd(false);
    }
  };

  const getAdTypeName = (t: "job" | "real_estate" | "classified") => {
    switch (t) {
      case "job": return "استخدام و کاریابی";
      case "real_estate": return "املاک صنعتی";
      case "classified": return "تجهیزات و ماشین‌آلات";
    }
  };

  const getAdTypeBadgeStyle = (t: "job" | "real_estate" | "classified") => {
    switch (t) {
      case "job": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "real_estate": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "classified": return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  // Filter and search ads
  const filteredAds = filterAds(ads, activeFilter, searchQuery);

  return (
    <div className="space-y-6 text-right" style={{ direction: "rtl" }}>
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">نیازمندی‌ها، استخدام و املاک صنعتی</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-semibold leading-relaxed">
            بازارچه و تابلوی اعلانات شهرک صنعتی: کاریابی و استخدام نیروی متخصص، رهن، اجاره و فروش املاک صنعتی، و مبادله ماشین‌آلات کارگاهی
          </p>
        </div>

        <div>
          {user ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200"
            >
              <Plus className="h-5 w-5" />
              <span>ثبت آگهی رایگان جدید</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full md:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
            >
              <Info className="h-4 w-4 text-slate-400" />
              <span>برای ثبت آگهی وارد شوید</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Tab filters */}
        <div className="lg:col-span-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              activeFilter === "all"
                ? "bg-slate-900 border-slate-950 text-white shadow-sm"
                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
            }`}
          >
            همه آگهی‌ها
          </button>
          <button
            onClick={() => setActiveFilter("real_estate")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === "real_estate"
                ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>املاک صنعتی</span>
          </button>
          <button
            onClick={() => setActiveFilter("job")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === "job"
                ? "bg-emerald-600 border-emerald-700 text-white shadow-sm"
                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>فرصت‌های استخدام</span>
          </button>
          <button
            onClick={() => setActiveFilter("classified")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === "classified"
                ? "bg-amber-600 border-amber-700 text-white shadow-sm"
                : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>ماشین‌آلات و ملزومات</span>
          </button>
        </div>

        {/* Search */}
        <div className="lg:col-span-4 relative">
          <input
            type="text"
            placeholder="جستجو در بین آگهی‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 shadow-sm"
          />
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Ads List Grid */}
      {loading ? (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400">در حال دریافت تابلوی اعلانات نیازمندی‌ها...</p>
          <ClassifiedGridSkeleton count={6} />
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-3" />
          <h4 className="font-extrabold text-slate-700 text-sm mb-1">آگهی یافت نشد</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            هیچ آگهی با مشخصات و فیلترهای انتخاب شده ثبت نشده است. شما می‌توانید اولین آگهی را ثبت کنید!
          </p>
          {user && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              ثبت آگهی رایگان
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAds.slice((adsPage - 1) * 6, adsPage * 6).map((ad, idx) => {
              const canDelete = isAdmin || (user && user.uid === ad.ownerId);
              return (
                <motion.div
                  key={`${ad.id}-${idx}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-slate-100/85 hover:border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Ad Image / Fallback */}
                    <div className="h-48 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                      {ad.image ? (
                        <img
                          src={ad.image}
                          alt={ad.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          {ad.type === "job" && <Briefcase className="h-12 w-12 text-emerald-200 mx-auto stroke-1" />}
                          {ad.type === "real_estate" && <Building2 className="h-12 w-12 text-indigo-200 mx-auto stroke-1" />}
                          {ad.type === "classified" && <Layers className="h-12 w-12 text-amber-200 mx-auto stroke-1" />}
                          <span className="text-[10px] text-slate-300 font-bold block">{getAdTypeName(ad.type)}</span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <span className={`absolute top-3 right-3 px-3 py-1 text-[10px] font-black rounded-lg border shadow-sm ${getAdTypeBadgeStyle(ad.type)}`}>
                        {getAdTypeName(ad.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Tag className="h-3 w-3" />
                          <span className="text-[10px] font-black">{ad.category}</span>
                        </div>
                        <h3 className="text-sm font-black text-slate-800 leading-snug hover:text-indigo-600 transition-colors">
                          {ad.title}
                        </h3>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                        {ad.description}
                      </p>

                      {/* Metadata */}
                      <div className="space-y-2.5 pt-2 text-[11px] text-slate-500 font-bold">
                        {ad.price && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                            <span>بودجه/حقوق/قیمت: <span className="text-slate-800 font-extrabold">{formatPrice(ad.price)}</span></span>
                          </div>
                        )}

                        {ad.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>موقعیت: <span className="text-slate-700">{ad.location}</span></span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>ثبت شده در: <span className="text-slate-400 font-mono text-[10px]">{new Date(ad.createdAt).toLocaleDateString("fa-IR")}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                    <a
                      href={`tel:${ad.phone}`}
                      className="flex-1 px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black text-center flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>تماس: {ad.phone}</span>
                    </a>

                    {canDelete && (
                      <button
                        onClick={() => setAdToDelete(ad)}
                        className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl hover:shadow-sm transition-all cursor-pointer"
                        title="حذف آگهی"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          {Math.ceil(filteredAds.length / 6) > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6" style={{ direction: "rtl" }}>
              <button
                onClick={() => setAdsPage(p => Math.max(1, p - 1))}
                disabled={adsPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1"
              >
                <span>قبلی</span>
              </button>
              
              {Array.from({ length: Math.ceil(filteredAds.length / 6) }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setAdsPage(pageNum)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    adsPage === pageNum
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setAdsPage(p => Math.min(Math.ceil(filteredAds.length / 6), p + 1))}
                disabled={adsPage === Math.ceil(filteredAds.length / 6)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1"
              >
                <span>بعدی</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Register Ad Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-extrabold text-base text-slate-800">ثبت آگهی جدید در تابلوی اعلانات شهرک</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
                {uploadError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold">
                    {uploadError}
                  </div>
                )}

                {/* Ad Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600">دسته‌بندی اصلی آگهی <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("job")}
                      className={`py-2 px-3 rounded-xl text-[11px] font-black border text-center transition-all ${
                        type === "job"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      فرصت استخدام / کارجو
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("real_estate")}
                      className={`py-2 px-3 rounded-xl text-[11px] font-black border text-center transition-all ${
                        type === "real_estate"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      املاک صنعتی
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("classified")}
                      className={`py-2 px-3 rounded-xl text-[11px] font-black border text-center transition-all ${
                        type === "classified"
                          ? "bg-amber-50 border-amber-200 text-amber-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      تجهیزات و ماشین‌آلات
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600">عنوان آگهی <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="مانند: استخدام فوری اپراتور تراشکار CNC، یا اجاره سوله ۱۲۰۰ متری"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                  />
                </div>

                {/* Sub-category selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-600">گروه تخصصی <span className="text-rose-500">*</span></label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-semibold"
                    >
                      {CLASSIFIED_CATEGORIES[type].map((cat, index) => (
                        <option key={index} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price / Salary / Budget */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-600">حقوق / قیمت / بودجه پیشنهادی</label>
                    <input
                      type="text"
                      placeholder="مانند: ۱۲ میلیون تومان، توافقی، رهن کامل و..."
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-600">آدرس یا موقعیت کارگاه/ملک</label>
                    <input
                      type="text"
                      placeholder="مثلا: بلوار اصلی، کوچه کوشش ۳"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-600">شماره تلفن تماس <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      required
                      placeholder="تلفن همراه جهت تماس متقاضیان"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-right font-semibold"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600">توضیحات تکمیلی و شرایط آگهی <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={4}
                    placeholder="شرح دقیق نیازها، ویژگی‌های ملک، ساعات کاری و مزایا، وضعیت دستگاه و جزئیات تماس..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold leading-relaxed"
                  />
                </div>

                {/* Image upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-600">آپلود تصویر مرتبط (اختیاری)</label>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {image ? (
                        <img src={image} alt="Upload Preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageUploading}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer animate-none"
                      >
                        {imageUploading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>درحال آپلود...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>انتخاب تصویر آگهی</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed block">
                        ابعاد مناسب: مربع یا ۴:۳ • حداکثر حجم مجاز: ۱ مگابایت
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submitting || imageUploading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>در حال ثبت...</span>
                      </>
                    ) : (
                      <span>انتشار آگهی در تابلوی اعلانات</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {adToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-sm w-full p-6 shadow-xl text-center space-y-4"
          >
            <div className="mx-auto h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-sm">حذف آگهی</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا از حذف آگهی با عنوان "{adToDelete.title}" مطمئن هستید؟ این اقدام غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExecuteDeleteAd}
                disabled={isDeletingAd}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-100 cursor-pointer disabled:bg-slate-300"
              >
                {isDeletingAd ? "در حال حذف..." : "بله، حذف شود"}
              </button>
              <button
                onClick={() => setAdToDelete(null)}
                disabled={isDeletingAd}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
