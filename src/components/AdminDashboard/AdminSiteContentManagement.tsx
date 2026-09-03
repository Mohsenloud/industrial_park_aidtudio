import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layout, 
  Megaphone, 
  Type, 
  Search, 
  ShieldCheck, 
  Users, 
  Award, 
  Factory, 
  Building2, 
  Info,
  Check,
  Globe,
  Sliders,
  Trash2,
  Palette,
  Image as ImageIcon,
  Upload,
  Paintbrush,
  Layers,
  Compass,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";
import { SiteContent, DEFAULT_SITE_CONTENT } from "../../types";
import { compressImage } from "../../lib/imageCompression";

interface AdminSiteContentManagementProps {
  onContentSaved?: (updatedContent: SiteContent) => void;
}

export default function AdminSiteContentManagement({ onContentSaved }: AdminSiteContentManagementProps) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"hero" | "sections" | "announcement" | "footer">("hero");
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Background customization helpers
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [customGradStart, setCustomGradStart] = useState("#1b2a4b");
  const [customGradEnd, setCustomGradEnd] = useState("#0f172a");
  const [customGradAngle, setCustomGradAngle] = useState("135");

  const COLOR_PRESETS = [
    { name: "سرمه‌ای صنعتی (پیش‌فرض)", color: "#1b2a4b", border: "#2a3d66" },
    { name: "سورمه‌ای اقیانوسی", color: "#0f172a", border: "#1e293b" },
    { name: "خاکستری کربنی", color: "#1e293b", border: "#334155" },
    { name: "آبی نیمه‌شب", color: "#172554", border: "#1e3a8a" },
    { name: "یشمی تولیدی", color: "#064e3b", border: "#065f46" },
    { name: "عنابی سازمانی", color: "#4c0519", border: "#881337" },
    { name: "برنزی متالیک", color: "#451a03", border: "#78350f" },
    { name: "دودی مدرن", color: "#18181b", border: "#27272a" },
    { name: "بنفش متالورژی", color: "#3b0764", border: "#581c87" },
  ];

  const GRADIENT_PRESETS = [
    { 
      name: "سرمه‌ای صنعتی به کربن", 
      gradient: "linear-gradient(135deg, #1b2a4b 0%, #0f172a 100%)",
      border: "#2a3d66"
    },
    { 
      name: "آبی اقیانوسی به لاجوردی", 
      gradient: "linear-gradient(135deg, #0369a1 0%, #1e1b4b 100%)",
      border: "#0284c7"
    },
    { 
      name: "بنفش متالیک به سرمه‌ای", 
      gradient: "linear-gradient(135deg, #4338ca 0%, #172554 100%)",
      border: "#4f46e5"
    },
    { 
      name: "زمردی صنعتی به زغالی", 
      gradient: "linear-gradient(135deg, #047857 0%, #064e3b 50%, #0f172a 100%)",
      border: "#059669"
    },
    { 
      name: "مسی و برنزی متالیک", 
      gradient: "linear-gradient(135deg, #b45309 0%, #78350f 50%, #18181b 100%)",
      border: "#d97706"
    },
    { 
      name: "یاقوتی و زرشکی متالورژی", 
      gradient: "linear-gradient(135deg, #9f1239 0%, #4c0519 50%, #0f172a 100%)",
      border: "#e11d48"
    },
    { 
      name: "فولاد کربنی و نقره‌ای", 
      gradient: "linear-gradient(135deg, #334155 0%, #1e293b 50%, #0f172a 100%)",
      border: "#475569"
    },
    { 
      name: "افق نارنجی به سرمه‌ای تیره", 
      gradient: "linear-gradient(135deg, #ea580c 0%, #1e1b4b 60%, #09090b 100%)",
      border: "#f97316"
    }
  ];

  const SAMPLE_INDUSTRIAL_IMAGES = [
    {
      name: "سوله و انبار صنعتی پیشرفته",
      url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=80"
    },
    {
      name: "خط تولید مدرن و بازوی رباتیک",
      url: "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=1600&q=80"
    },
    {
      name: "کارخانه متالورژی و ساخت دقیق",
      url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1600&q=80"
    },
    {
      name: "ماشین‌آلات مهندسی و تراشکاری",
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80"
    }
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("لطفاً یک فایل تصویری معتبر انتخاب کنید.");
      return;
    }

    try {
      setIsUploadingImage(true);
      const compressed = await compressImage(file, 0.6, 1600);
      const reader = new FileReader();
      reader.readAsDataURL(compressed);
      reader.onload = async () => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ image: reader.result, fileName: file.name })
          });
          const data = await res.json();
          if (res.ok && data.url) {
            handleChange("heroBgImage", data.url);
            handleChange("heroBgType", "image");
            toast.success("تصویر پس‌زمینه کادر اصلی با موفقیت بارگذاری شد.");
          } else {
            throw new Error(data.error || "خطا در آپلود تصویر");
          }
        } catch (err: any) {
          toast.error(err.message || "خطا در بارگذاری تصویر روی سرور");
        } finally {
          setIsUploadingImage(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
    } catch (err: any) {
      setIsUploadingImage(false);
      toast.error("خطا در فشرده‌سازی و پردازش تصویر.");
    }
  };

  const applyCustomGradient = () => {
    const grad = `linear-gradient(${customGradAngle}deg, ${customGradStart} 0%, ${customGradEnd} 100%)`;
    handleChange("heroBgGradient", grad);
    handleChange("heroBgType", "gradient");
    toast.success("گرادیانت سفارشی با موفقیت تنظیم شد.");
  };

  const getAuthHeaders = (): Record<string, string> => {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    const savedUser = localStorage.getItem("custom_auth_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          headers["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch (_) {}
    }
    const adminSession = localStorage.getItem("custom_admin_session");
    if (adminSession && !headers["Authorization"]) {
      try {
        const parsed = JSON.parse(adminSession);
        if (parsed?.token) {
          headers["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch (_) {}
    }
    return headers;
  };

  const fetchContent = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/site-content");
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setContent({ ...DEFAULT_SITE_CONTENT, ...data });
      }
    } catch (err) {
      console.warn("Notice: could not load site content dynamically, using defaults:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleChange = (field: keyof SiteContent, value: any) => {
    setContent(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(content)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "خطا در ذخیره متون");
      }

      toast.success("متون صفحه اصلی با موفقیت ذخیره و به‌روزرسانی شد.");
      setHasChanges(false);
      window.dispatchEvent(new CustomEvent("siteContentUpdated", { detail: content }));
      if (onContentSaved) {
        onContentSaved(content);
      }
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره‌سازی اطلاعات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setContent(DEFAULT_SITE_CONTENT);
    setHasChanges(true);
    setShowResetConfirm(false);
    toast.success("متون فرم به مقادیر پیش‌فرض سیستم بازنشانی شدند. برای اعمال دکمه ذخیره را بزنید.");
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-bold text-sm">در حال دریافت متون صفحه اصلی...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold mb-3 border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              <span>سیستم مدیریت محتوا و متون صفحه اول (CMS)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              ویرایش متون، تیترها و پاراگراف‌های صفحه اصلی
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
              شما به عنوان مدیر ارشد می‌توانید تمامی عناوین، شعارها، معرفی کارگاه‌ها، راهنماها و پیام‌های سراسری صفحه اول را شخصی‌سازی کنید.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showLivePreview 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700" 
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {showLivePreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showLivePreview ? "مخفی‌سازی پیش‌نمایش" : "نمایش پیش‌نمایش زنده"}</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>بازنشانی پیش‌فرض</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>ذخیره و انتشار تغییرات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 mx-auto border border-amber-100">
                <RotateCcw className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-slate-800 text-center mb-2">
                بازنشانی کلیه متون به حالت پیش‌فرض؟
              </h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed mb-6">
                با تایید این عملیات، تمامی فیلدهای صفحه به متن‌های پیش‌فرض اولیه سامانه برمی‌گردند. برای اعمال دائم در سایت باید دکمه ذخیره را بزنید.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetToDefaults}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  بله، بازنشانی شود
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Grid: Form Left, Preview Right */}
      <div className={`grid grid-cols-1 ${showLivePreview ? "lg:grid-cols-12" : "lg:grid-cols-1"} gap-6`}>
        {/* Form Panel */}
        <div className={showLivePreview ? "lg:col-span-7 space-y-4" : "space-y-4"}>
          {/* Sub-Tabs Nav */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveSubTab("hero")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === "hero"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Layout className="h-4 w-4" />
              <span>بنر اصلی (Hero Section)</span>
            </button>

            <button
              onClick={() => setActiveSubTab("sections")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === "sections"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Type className="h-4 w-4" />
              <span>تیترها و عنوان هدر</span>
            </button>

            <button
              onClick={() => setActiveSubTab("announcement")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === "announcement"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Megaphone className="h-4 w-4" />
              <span>نوار اعلان ویژه بالای سایت</span>
            </button>

            <button
              onClick={() => setActiveSubTab("footer")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === "footer"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>فوتر و پاورقی سامانه</span>
            </button>
          </div>

          {/* Tab 1: Hero Section */}
          {activeSubTab === "hero" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Layout className="h-4 w-4 text-indigo-600" />
                  <span>تنظیمات بنر تیره بالای صفحه اصلی (Hero Box)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  این بخش کادر بزرگ تیره در بالای صفحه اول است که بیشترین جلب توجه را دارد.
                </p>
              </div>

              {/* Background Style Customization Panel (رنگ، عکس یا گرادیانت) */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-900/40 shadow-md space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800/80 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Palette className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                        <span>رنگ و پس‌زمینه کادر اصلی صفحه اول</span>
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          شخصی‌سازی زنده
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        نوع پس‌زمینه کادر اصلی را بین رنگ یکدست، گرادیانت متالیک یا تصویر انتخاب و ویرایش کنید.
                      </p>
                    </div>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleChange("heroBgType", "solid")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        (content.heroBgType || "solid") === "solid"
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Paintbrush className="h-3.5 w-3.5" />
                      <span>رنگ تک</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange("heroBgType", "gradient")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        content.heroBgType === "gradient"
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>گرادیانت</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange("heroBgType", "image")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        content.heroBgType === "image"
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>عکس پس‌زمینه</span>
                    </button>
                  </div>
                </div>

                {/* Sub-view: Mode 1 - Solid Color */}
                {(!content.heroBgType || content.heroBgType === "solid") && (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        پالت رنگ‌های سازمانی و صنعتی پیشنهادی:
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {COLOR_PRESETS.map((preset) => {
                          const isSelected = (content.heroBgColor || "#1b2a4b") === preset.color;
                          return (
                            <button
                              key={preset.color}
                              type="button"
                              onClick={() => {
                                handleChange("heroBgColor", preset.color);
                                handleChange("heroBorderColor", preset.border);
                                handleChange("heroBgType", "solid");
                              }}
                              className={`p-2 rounded-xl text-right transition-all cursor-pointer border flex flex-col gap-1.5 ${
                                isSelected
                                  ? "bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/50"
                                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span 
                                  className="w-5 h-5 rounded-lg border border-white/20 shrink-0 shadow-inner"
                                  style={{ backgroundColor: preset.color }}
                                />
                                {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                              </div>
                              <span className="text-[10px] font-bold text-slate-300 truncate">
                                {preset.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Color Picker & Hex Input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">
                          رنگ پس‌زمینه اختصاصی (Color Picker / کد هگز):
                        </label>
                        <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
                          <input
                            type="color"
                            value={content.heroBgColor || "#1b2a4b"}
                            onChange={(e) => {
                              handleChange("heroBgColor", e.target.value);
                              handleChange("heroBgType", "solid");
                            }}
                            className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={content.heroBgColor || "#1b2a4b"}
                            onChange={(e) => {
                              handleChange("heroBgColor", e.target.value);
                              handleChange("heroBgType", "solid");
                            }}
                            placeholder="#1b2a4b"
                            className="flex-1 bg-transparent text-xs font-mono text-white outline-none px-2 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400">
                          رنگ خط حاشیه دور کادر (Border Color):
                        </label>
                        <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
                          <input
                            type="color"
                            value={content.heroBorderColor || "#2a3d66"}
                            onChange={(e) => handleChange("heroBorderColor", e.target.value)}
                            className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={content.heroBorderColor || "#2a3d66"}
                            onChange={(e) => handleChange("heroBorderColor", e.target.value)}
                            placeholder="#2a3d66"
                            className="flex-1 bg-transparent text-xs font-mono text-white outline-none px-2 text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-view: Mode 2 - Gradient */}
                {content.heroBgType === "gradient" && (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        گرادیانت‌های آماده صنعتی و متالیک:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {GRADIENT_PRESETS.map((preset) => {
                          const isSelected = content.heroBgGradient === preset.gradient;
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                handleChange("heroBgGradient", preset.gradient);
                                handleChange("heroBorderColor", preset.border);
                                handleChange("heroBgType", "gradient");
                              }}
                              className={`p-2.5 rounded-xl text-right transition-all cursor-pointer border flex flex-col gap-2 ${
                                isSelected
                                  ? "bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/50"
                                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <div 
                                className="w-full h-7 rounded-lg border border-white/20 shadow-inner flex items-center justify-end p-1"
                                style={{ background: preset.gradient }}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                              </div>
                              <span className="text-[10px] font-bold text-slate-300 truncate">
                                {preset.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Custom Gradient Builder */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Compass className="h-3.5 w-3.5" />
                          <span>گرادیانت‌ساز سفارشی (انتخاب ۲ رنگ و زاویه):</span>
                        </span>
                        <button
                          type="button"
                          onClick={applyCustomGradient}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          اعمال این گرادیانت
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">رنگ اول:</label>
                          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700">
                            <input
                              type="color"
                              value={customGradStart}
                              onChange={(e) => setCustomGradStart(e.target.value)}
                              className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] font-mono text-slate-300">{customGradStart}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">رنگ دوم:</label>
                          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700">
                            <input
                              type="color"
                              value={customGradEnd}
                              onChange={(e) => setCustomGradEnd(e.target.value)}
                              className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                            />
                            <span className="text-[10px] font-mono text-slate-300">{customGradEnd}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">زاویه گرادیانت:</label>
                          <select
                            value={customGradAngle}
                            onChange={(e) => setCustomGradAngle(e.target.value)}
                            className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-200 outline-none cursor-pointer"
                          >
                            <option value="45">۴۵ درجه (مورب بالا)</option>
                            <option value="90">۹۰ درجه (افقی)</option>
                            <option value="135">۱۳۵ درجه (مورب استاندارد)</option>
                            <option value="180">۱۸۰ درجه (عمودی)</option>
                          </select>
                        </div>
                      </div>

                      {/* Direct CSS Gradient Input */}
                      <div className="pt-2 border-t border-slate-800">
                        <label className="text-[10px] text-slate-400 block mb-1">
                          یا ویرایش دستی کد CSS گرادیانت:
                        </label>
                        <input
                          type="text"
                          value={content.heroBgGradient || ""}
                          onChange={(e) => handleChange("heroBgGradient", e.target.value)}
                          placeholder="linear-gradient(135deg, #1b2a4b 0%, #0f172a 100%)"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-indigo-300 outline-none text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-view: Mode 3 - Image */}
                {content.heroBgType === "image" && (
                  <div className="space-y-3.5 animate-fadeIn">
                    {/* Upload button & direct URL input */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Upload className="h-3.5 w-3.5" />
                          <span>تصویر پس‌زمینه کادر اصلی:</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                          >
                            {isUploadingImage ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            <span>{isUploadingImage ? "در حال آپلود..." : "آپلود تصویر از دستگاه"}</span>
                          </button>

                          {content.heroBgImage && (
                            <button
                              type="button"
                              onClick={() => {
                                handleChange("heroBgImage", "");
                                handleChange("heroBgType", "solid");
                                toast.success("تصویر پس‌زمینه حذف و کادر به رنگ پیش‌فرض بازگشت.");
                              }}
                              className="px-2.5 py-1.5 bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              حذف تصویر
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Direct URL input */}
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          یا درج مستقیم آدرس اینترنتی تصویر (Image URL):
                        </label>
                        <input
                          type="text"
                          value={content.heroBgImage || ""}
                          onChange={(e) => {
                            handleChange("heroBgImage", e.target.value);
                            handleChange("heroBgType", "image");
                          }}
                          placeholder="https://example.com/factory-bg.jpg"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 outline-none text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Industrial Image Presets */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        تصاویر صنعتی باکیفیت و بهینه‌شده پیشنهادی:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SAMPLE_INDUSTRIAL_IMAGES.map((sample) => {
                          const isSelected = content.heroBgImage === sample.url;
                          return (
                            <button
                              key={sample.name}
                              type="button"
                              onClick={() => {
                                handleChange("heroBgImage", sample.url);
                                handleChange("heroBgType", "image");
                              }}
                              className={`p-1.5 rounded-xl text-right transition-all cursor-pointer border flex flex-col gap-1.5 relative overflow-hidden group ${
                                isSelected
                                  ? "bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md"
                                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <div className="relative w-full h-14 rounded-lg overflow-hidden border border-white/10">
                                <img
                                  src={sample.url}
                                  alt={sample.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-slate-950/40" />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                    <Check className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-300 truncate px-0.5">
                                {sample.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dark Overlay Opacity Slider */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
                          <span>روکش تیره روی تصویر جهت خوانایی متون (Dark Overlay):</span>
                        </span>
                        <span className="font-mono text-indigo-300 font-bold">
                          {content.heroBgOverlayOpacity !== undefined ? content.heroBgOverlayOpacity : 65}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={content.heroBgOverlayOpacity !== undefined ? content.heroBgOverlayOpacity : 65}
                        onChange={(e) => handleChange("heroBgOverlayOpacity", parseInt(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>تصویر روشن‌تر (۱۰٪)</span>
                        <span>استاندارد (۶۵٪)</span>
                        <span>تصویر تیره‌تر و خواناتر (۹۰٪)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Badge Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  متن برچسب / نشان بالای تیتر (Badge):
                </label>
                <input
                  type="text"
                  value={content.heroBadge || ""}
                  onChange={(e) => handleChange("heroBadge", e.target.value)}
                  placeholder="مثال: مرجع رسمی صنعتگران و تولیدکنندگان شهرک صنعتی"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Main Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    تیتر اصلی و بزرگ صفحه اول (H1/H2 Heading):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(content.heroTitle || "").length} کاراکتر
                  </span>
                </div>
                <input
                  type="text"
                  value={content.heroTitle || ""}
                  onChange={(e) => handleChange("heroTitle", e.target.value)}
                  placeholder="مثال: بانک اطلاعات و محصولات واحدهای تولیدی"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Subtitle / Paragraph */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    پاراگراف توضیحی و معرفی (Subtitle Paragraph):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(content.heroSubtitle || "").length} کاراکتر
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={content.heroSubtitle || ""}
                  onChange={(e) => handleChange("heroSubtitle", e.target.value)}
                  placeholder="توضیحات و راهنمای کاربران و صاحبان کارگاه‌ها..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Search Placeholder */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  متن راهنمای درون کادر جستجو (Search Placeholder):
                </label>
                <input
                  type="text"
                  value={content.heroSearchPlaceholder || ""}
                  onChange={(e) => handleChange("heroSearchPlaceholder", e.target.value)}
                  placeholder="مثال: جستجوی نام کارگاه، خدمات یا محصولات..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Three Features */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-700">
                  متون ۳ ویژگی بارز زیر کادر جستجو (۳ ستون پایین بنر):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                      <span>ویژگی اول:</span>
                    </label>
                    <input
                      type="text"
                      value={content.heroFeature1 || ""}
                      onChange={(e) => handleChange("heroFeature1", e.target.value)}
                      placeholder="اطلاعات تأیید شده"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                      <span>ویژگی دوم:</span>
                    </label>
                    <input
                      type="text"
                      value={content.heroFeature2 || ""}
                      onChange={(e) => handleChange("heroFeature2", e.target.value)}
                      placeholder="دسترسی مستقیم"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-indigo-500" />
                      <span>ویژگی سوم:</span>
                    </label>
                    <input
                      type="text"
                      value={content.heroFeature3 || ""}
                      onChange={(e) => handleChange("heroFeature3", e.target.value)}
                      placeholder="معرفی کالا و خدمات"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Section Headings & Header */}
          {activeSubTab === "sections" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Type className="h-4 w-4 text-indigo-600" />
                  <span>عناوین بخش‌ها و نام تجاری سامانه در هدر</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تنظیم نام تجاری، عنوان هدر بالای سایت و تیتر بخش کارگاه‌های تولیدی
                </p>
              </div>

              {/* Header Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    عنوان برند سامانه در نوار بالا (Header Title):
                  </label>
                  <input
                    type="text"
                    value={content.headerTitle || ""}
                    onChange={(e) => handleChange("headerTitle", e.target.value)}
                    placeholder="مثال: شهرک صنعتی"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    شعار یا زیرعنوان در نوار بالا (Header Subtitle):
                  </label>
                  <input
                    type="text"
                    value={content.headerSubtitle || ""}
                    onChange={(e) => handleChange("headerSubtitle", e.target.value)}
                    placeholder="مثال: بانک اطلاعات و محصولات واحدهای تولیدی"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Units Section Title */}
              <div className="pt-3 border-t border-slate-100 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    تیتر بخش کارت‌های کارگاه‌ها در صفحه اصلی:
                  </label>
                  <input
                    type="text"
                    value={content.unitsSectionTitle || ""}
                    onChange={(e) => handleChange("unitsSectionTitle", e.target.value)}
                    placeholder="مثال: واحدهای تولیدی شهرک صنعتی"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    توضیح یا زیرعنوان بخش کارگاه‌ها:
                  </label>
                  <input
                    type="text"
                    value={content.unitsSectionSubtitle || ""}
                    onChange={(e) => handleChange("unitsSectionSubtitle", e.target.value)}
                    placeholder="مثال: بانک اطلاعات جامع کارگاه‌ها و کارخانجات فعال"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Announcement Notice Bar */}
          {activeSubTab === "announcement" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-amber-500" />
                  <span>نوار اعلان، پیام فوری یا پیام تبریک بالای سایت</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  در صورت فعال‌سازی، یک نوار باریک با پیام مورد نظر شما در بالاترین نقطه تمامی صفحات به نمایش درمی‌آید.
                </p>
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    نمایش نوار اعلان در بالای سایت
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    با فعال کردن این گزینه، پیام فوری به کلیه بازدیدکنندگان نشان داده می‌شود.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("announcementEnabled", !content.announcementEnabled)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer flex items-center ${
                    content.announcementEnabled ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Alert Type Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  نوع و تم رنگی نوار اعلان:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("announcementType", "info")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      content.announcementType === "info" || !content.announcementType
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>اطلاع‌رسانی (آبی)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("announcementType", "warning")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      content.announcementType === "warning"
                        ? "bg-amber-50 border-amber-500 text-amber-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>هشدار / مهم (نارنجی)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("announcementType", "success")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      content.announcementType === "success"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>ویژه / تبریک (سبز)</span>
                  </button>
                </div>
              </div>

              {/* Announcement Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    متن پیام اعلان:
                  </label>
                  {content.announcementText && (
                    <button
                      type="button"
                      onClick={() => {
                        handleChange("announcementText", "");
                        handleChange("announcementEnabled", false);
                        toast.success("متن اعلان پاکسازی و نمایش آن غیرفعال شد.");
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف و پاکسازی اعلان</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={content.announcementText || ""}
                  onChange={(e) => handleChange("announcementText", e.target.value)}
                  placeholder="مثال: به سامانه جامع شهرک صنعتی خوش آمدید. ثبت اطلاعات کارگاه‌های تولیدی به صورت کاملاً رایگان انجام می‌پذیرد."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all leading-relaxed"
                />
              </div>
            </motion.div>
          )}

          {/* Tab 4: Footer */}
          {activeSubTab === "footer" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5"
            >
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>متون فوتر و پاورقی پایین سایت</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  پاراگراف معرفی سامانه، متن کپی‌رایت و اطلاعات تماس در انتهای تمام صفحات
                </p>
              </div>

              {/* Footer Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  تیتر معرفی در فوتر:
                </label>
                <input
                  type="text"
                  value={content.footerTitle || ""}
                  onChange={(e) => handleChange("footerTitle", e.target.value)}
                  placeholder="مثال: سامانه بانک اطلاعاتی آنلاین واحدهای تولیدی شهرک صنعتی"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Footer Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  پاراگراف توضیحات معرفی در فوتر:
                </label>
                <textarea
                  rows={3}
                  value={content.footerDescription || ""}
                  onChange={(e) => handleChange("footerDescription", e.target.value)}
                  placeholder="این پلتفرم به صورت رایگان در جهت رونق کسب‌وکارهای تولیدی..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Contact Notice Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  متن راهنمای تماس و پشتیبانی:
                </label>
                <input
                  type="text"
                  value={content.footerContactText || ""}
                  onChange={(e) => handleChange("footerContactText", e.target.value)}
                  placeholder="در صورت نیاز به پشتیبانی یا ثبت اطلاعات با مدیریت سامانه در ارتباط باشید."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Copyright Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  متن کپی‌رایت انتهای فوتر:
                </label>
                <input
                  type="text"
                  value={content.footerCopyright || ""}
                  onChange={(e) => handleChange("footerCopyright", e.target.value)}
                  placeholder="Industrial Park Directory © 2026 - کلیه حقوق محفوظ است"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* Quick Bottom Action Bar */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2.5 h-2.5 rounded-full ${hasChanges ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <span>{hasChanges ? "تغییرات ذخیره نشده دارید" : "تمامی تغییرات ذخیره هستند"}</span>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>ذخیره تغییرات متون</span>
            </button>
          </div>
        </div>

        {/* Live Mockup Preview Column */}
        {showLivePreview && (
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-800">
                      پیش‌نمایش زنده صفحه اصلی (Live Preview)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    شبیه‌سازی بلادرنگ
                  </span>
                </div>

                <div className="space-y-4 bg-slate-100 p-3 rounded-2xl border border-slate-200/80">
                  {/* Announcement Mockup */}
                  {content.announcementEnabled && content.announcementText && (
                    <div className={`px-3 py-2 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-sm ${
                      content.announcementType === "warning"
                        ? "bg-amber-500 text-slate-900"
                        : content.announcementType === "success"
                        ? "bg-emerald-600 text-white"
                        : "bg-indigo-600 text-white"
                    }`}>
                      <Megaphone className="h-3 w-3 shrink-0" />
                      <span>{content.announcementText}</span>
                    </div>
                  )}

                  {/* Header Mockup */}
                  <div className="bg-white rounded-xl p-2.5 shadow-sm flex items-center justify-between border border-slate-200 text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xs">
                        <Factory className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-none">
                          {content.headerTitle || DEFAULT_SITE_CONTENT.headerTitle}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
                          {content.headerSubtitle || DEFAULT_SITE_CONTENT.headerSubtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">
                      ورود کاربر
                    </span>
                  </div>

                  {/* Hero Mockup with Dynamic Background Styling */}
                  <div 
                    className="text-white p-4 rounded-2xl text-center space-y-2 border shadow-md relative overflow-hidden transition-all duration-300"
                    style={{
                      backgroundColor: content.heroBgType === "solid" ? (content.heroBgColor || "#1b2a4b") : "#1b2a4b",
                      backgroundImage: content.heroBgType === "gradient" 
                        ? (content.heroBgGradient || "linear-gradient(135deg, #1b2a4b 0%, #0f172a 100%)")
                        : content.heroBgType === "image" && content.heroBgImage
                        ? `url(${content.heroBgImage})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderColor: content.heroBorderColor || "#2a3d66",
                    }}
                  >
                    {/* Dark Overlay Layer for background image */}
                    {content.heroBgType === "image" && content.heroBgImage && (
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundColor: `rgba(15, 23, 42, ${(content.heroBgOverlayOpacity !== undefined ? content.heroBgOverlayOpacity : 65) / 100})`
                        }}
                      />
                    )}

                    <div className="relative z-10 space-y-2">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-semibold border border-indigo-500/30">
                        <Factory className="h-2.5 w-2.5" />
                        <span>{content.heroBadge || DEFAULT_SITE_CONTENT.heroBadge}</span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                        {content.heroTitle || DEFAULT_SITE_CONTENT.heroTitle}
                      </h4>

                      <p className="text-[10px] text-slate-300 font-light line-clamp-3 leading-relaxed px-1">
                        {content.heroSubtitle || DEFAULT_SITE_CONTENT.heroSubtitle}
                      </p>

                      {/* Search box Mockup */}
                      <div className="bg-white rounded-xl p-1.5 flex items-center gap-1.5 text-slate-400 text-[10px] mt-2 text-right">
                        <Search className="h-3 w-3 text-slate-400 shrink-0 mr-1" />
                        <span className="text-slate-400 truncate flex-1">
                          {content.heroSearchPlaceholder || DEFAULT_SITE_CONTENT.heroSearchPlaceholder}
                        </span>
                        <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-bold">
                          دسته‌بندی‌ها
                        </span>
                      </div>

                      {/* Feature 3 columns */}
                      <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-slate-700/60 text-[9px] text-slate-300">
                        <div className="truncate">{content.heroFeature1 || "اطلاعات تأیید شده"}</div>
                        <div className="truncate">{content.heroFeature2 || "دسترسی مستقیم"}</div>
                        <div className="truncate">{content.heroFeature3 || "معرفی کالا"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Section title Mockup */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-none">
                          {content.unitsSectionTitle || DEFAULT_SITE_CONTENT.unitsSectionTitle}
                        </p>
                        {content.unitsSectionSubtitle && (
                          <p className="text-[9px] text-slate-400 mt-0.5 leading-none">
                            {content.unitsSectionSubtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                      ۲۴ واحد
                    </span>
                  </div>

                  {/* Footer Mockup */}
                  <div className="bg-slate-900 text-slate-400 p-3 rounded-xl text-[10px] text-center space-y-1.5 border border-slate-800">
                    <p className="font-black text-slate-200 text-[11px]">
                      {content.footerTitle || DEFAULT_SITE_CONTENT.footerTitle}
                    </p>
                    <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">
                      {content.footerDescription || DEFAULT_SITE_CONTENT.footerDescription}
                    </p>
                    <p className="text-[8px] text-slate-500 pt-1 border-t border-slate-800">
                      {content.footerCopyright || DEFAULT_SITE_CONTENT.footerCopyright}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
