import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Megaphone, 
  Plus, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  Edit3, 
  Trash2,
  AlertTriangle
} from "lucide-react";
import { motion } from "motion/react";
import { compressImage } from "../../lib/imageCompression";
import toast from "react-hot-toast";

interface BannerManagerProps {
  isAdmin: boolean;
  onClose?: () => void;
  key?: any;
}

export default function BannerManager({ isAdmin, onClose }: BannerManagerProps) {
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<any | null>(null);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);

  // Banner Form States
  const [bannerCompanyName, setBannerCompanyName] = useState("");
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerDescription, setBannerDescription] = useState("");
  const [bannerBadge, setBannerBadge] = useState("");
  const [bannerPhone, setBannerPhone] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const bannerImgInputRef = useRef<HTMLInputElement>(null);

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

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const res = await fetch("/api/banners");
      if (res.ok) {
        const data = await res.json();
        setBannersList(data || []);
      }
    } catch (err) {
      console.error("Error fetching banners:", err);
    } finally {
      setBannersLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setBannerImageUploading(true);

    const MAX_SIZE = 800 * 1024; // 800 KB
    if (file.size > MAX_SIZE) {
      setUploadError("حجم فایل انتخاب شده بیش از حد مجاز (۸۰۰ کیلوبایت) است.");
      toast.error("حجم تصویر بنر تبلیغاتی نباید بیشتر از ۸۰۰ کیلوبایت باشد.");
      setBannerImageUploading(false);
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
            setBannerImage(data.url);
          } else {
            throw new Error(data.error || "آپلود ناموفق بود");
          }
        } catch (innerErr: any) {
          console.error(innerErr);
          setUploadError("خطا در ذخیره‌سازی تصویر در سرور.");
        } finally {
          setBannerImageUploading(false);
        }
      };
    } catch (err) {
      console.error(err);
      setUploadError("خطا در پردازش و خواندن فایل تصویر.");
      setBannerImageUploading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerCompanyName.trim() || !bannerTitle.trim() || !bannerDescription.trim() || !bannerPhone.trim()) {
      toast.error("لطفا فیلدهای اصلی را تکمیل کنید.");
      return;
    }
    if (!bannerImage) {
      toast.error("لطفا تصویر بنر را بارگذاری کنید.");
      return;
    }

    setSavingBanner(true);
    const headers = {
      ...getHeaders(),
      "Content-Type": "application/json"
    };

    const payload = {
      id: editingBanner?.id || `ad_${Date.now()}`,
      companyName: bannerCompanyName.trim(),
      title: bannerTitle.trim(),
      description: bannerDescription.trim(),
      image: bannerImage,
      badge: bannerBadge.trim() || "تبلیغات ویژه",
      phone: bannerPhone.trim(),
      createdAt: editingBanner?.createdAt || new Date().toISOString()
    };

    try {
      const res = await fetch("/api/banners", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("بنر تبلیغاتی با موفقیت ذخیره شد.");
        setIsAddingBanner(false);
        setEditingBanner(null);
        setBannerCompanyName("");
        setBannerTitle("");
        setBannerDescription("");
        setBannerBadge("");
        setBannerPhone("");
        setBannerImage("");
        fetchBanners();
      } else {
        const data = await res.json();
        toast.error(data.error || "خطا در ذخیره بنر.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleExecuteDeleteBanner = async () => {
    if (!bannerToDelete) return;
    setIsDeletingBanner(true);
    try {
      const res = await fetch(`/api/banners/${bannerToDelete.id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (res.ok) {
        toast.success("بنر تبلیغاتی با موفقیت حذف شد.");
        setBannerToDelete(null);
        fetchBanners();
      } else {
        toast.error("خطا در حذف بنر.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setIsDeletingBanner(false);
    }
  };

  const startEditingBanner = (banner: any) => {
    setEditingBanner(banner);
    setIsAddingBanner(true);
    setBannerCompanyName(banner.companyName);
    setBannerTitle(banner.title);
    setBannerDescription(banner.description);
    setBannerBadge(banner.badge);
    setBannerPhone(banner.phone);
    setBannerImage(banner.image);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6 text-right mb-8"
      style={{ direction: "rtl" }}
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-600" />
          <h3 className="font-extrabold text-lg text-slate-800">مدیریت بنرهای تبلیغاتی و حامیان صنعتی</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsAddingBanner(!isAddingBanner);
              if (editingBanner) {
                setEditingBanner(null);
                setBannerCompanyName("");
                setBannerTitle("");
                setBannerDescription("");
                setBannerBadge("");
                setBannerPhone("");
                setBannerImage("");
              }
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isAddingBanner ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isAddingBanner ? "بستن فرم" : "افزودن بنر تبلیغاتی جدید"}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {isAddingBanner && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60"
        >
          <form onSubmit={handleSaveBanner} className="space-y-4">
            <h4 className="text-xs font-black text-indigo-900 mb-2">
              {editingBanner ? "ویرایش بنر تبلیغاتی" : "ثبت بنر تبلیغاتی جدید"}
            </h4>
            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold mb-3">
                {uploadError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">نام شرکت / کارفرما <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مانند: صنایع فولاد پایتخت"
                  value={bannerCompanyName}
                  onChange={(e) => setBannerCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">برچسب (Badge) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="مانند: تامین‌کننده طلایی، پیشنهاد ویژه"
                  value={bannerBadge}
                  onChange={(e) => setBannerBadge(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600">عنوان اصلی بنر <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مانند: عرضه مستقیم انواع لوله‌های صنعتی با بهترین قیمت"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">تلفن هماهنگی / تماس <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مانند: ۰۲۱-۸۸۸۸۸۸۸۸"
                  value={bannerPhone}
                  onChange={(e) => setBannerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold text-left font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">تصویر پس‌زمینه بنر <span className="text-rose-500">*</span></label>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                    {bannerImage ? (
                      <img src={bannerImage} alt="Banner Preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={bannerImgInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => bannerImgInputRef.current?.click()}
                      disabled={bannerImageUploading}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {bannerImageUploading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>در حال بارگذاری...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                          <span>آپلود تصویر بنر</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed block">
                      ابعاد پیشنهادی: عریض (۱۶:۹ یا ترجیحاً ۱۲۰۰×۴۰۰ پیکسل) • حداکثر حجم مجاز: ۸۰۰ کیلوبایت
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600">توضیحات تکمیلی بنر <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  placeholder="توضیحات جامع درباره خدمات، آفرها، تخفیف‌ها یا توانمندی‌های شرکت جهت نمایش در اسلایدر بنر اصلی..."
                  value={bannerDescription}
                  onChange={(e) => setBannerDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingBanner || bannerImageUploading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md disabled:bg-slate-300"
              >
                {savingBanner ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>در حال ذخیره‌سازی...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>ثبت و انتشار بنر</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingBanner(false);
                  setEditingBanner(null);
                  setBannerCompanyName("");
                  setBannerTitle("");
                  setBannerDescription("");
                  setBannerBadge("");
                  setBannerPhone("");
                  setBannerImage("");
                }}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-700">لیست بنرهای فعال فعلی در سایت ({bannersList.length})</h4>
        
        {bannersLoading ? (
          <div className="flex items-center justify-center p-8 text-indigo-600">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : bannersList.length === 0 ? (
          <div className="text-center p-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            هیچ بنر تبلیغاتی فعالی ثبت نشده است. بنر جدید اضافه کنید.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bannersList.map((ad, idx) => (
              <div
                key={`${ad.id}-${idx}`}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3 shadow-sm hover:border-indigo-200 transition-all text-right"
              >
                <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                  <img src={ad.image} alt={ad.companyName} referrerPolicy="no-referrer" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                      {ad.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{ad.companyName}</span>
                  </div>
                  <h5 className="text-xs font-black text-slate-800 line-clamp-1">{ad.title}</h5>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-normal">{ad.description}</p>
                  
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60">
                    <span className="text-[9px] font-mono text-slate-400">تلفن: {ad.phone}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditingBanner(ad)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="ویرایش بنر"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerToDelete(ad)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف بنر"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {bannerToDelete && (
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
              <h3 className="font-extrabold text-slate-800 text-sm">حذف بنر تبلیغاتی</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا از حذف بنر تبلیغاتی متعلق به "{bannerToDelete.companyName}" مطمئن هستید؟ این اقدام غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExecuteDeleteBanner}
                disabled={isDeletingBanner}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-100 cursor-pointer disabled:bg-slate-300"
              >
                {isDeletingBanner ? "در حال حذف..." : "بله، حذف شود"}
              </button>
              <button
                onClick={() => setBannerToDelete(null)}
                disabled={isDeletingBanner}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
