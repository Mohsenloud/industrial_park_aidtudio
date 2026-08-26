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
  AlertTriangle,
  Phone,
  Smartphone,
  ExternalLink,
  Globe,
  Eye,
  Copy,
  Sparkles,
  Layers,
  Palette,
  Calendar,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { compressImage } from "../../lib/imageCompression";
import { BannerAd } from "../../types";
import toast from "react-hot-toast";

interface BannerManagerProps {
  isAdmin: boolean;
  onClose?: () => void;
}

const BADGE_COLORS: { id: BannerAd['badgeColor']; label: string; bg: string; text: string; border: string }[] = [
  { id: 'amber', label: 'طلایی / کهربایی', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'emerald', label: 'سبز / زمردی', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'indigo', label: 'آبی / نیلی', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  { id: 'rose', label: 'قرمز / یاقوتی', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  { id: 'violet', label: 'بنفش سلطنتی', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  { id: 'cyan', label: 'فیروزه‌ای مدرن', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { id: 'slate', label: 'نقره‌ای / متالیک', bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
];

const THEME_PRESETS: { id: BannerAd['themeColor']; label: string; bgClass: string }[] = [
  { id: 'dark', label: 'تخته‌سنگ تیره (Slate)', bgClass: 'from-slate-950 via-slate-900 to-slate-950' },
  { id: 'navy', label: 'سرمه‌ای اقیانوسی (Navy)', bgClass: 'from-slate-950 via-blue-950 to-slate-950' },
  { id: 'emerald', label: 'سبز صنعتی (Forest)', bgClass: 'from-slate-950 via-emerald-950 to-slate-950' },
  { id: 'amber', label: 'برنزی / طلایی تیره (Bronze)', bgClass: 'from-slate-950 via-amber-950/70 to-slate-950' },
  { id: 'carbon', label: 'کربن مشکی (Pure Carbon)', bgClass: 'from-black via-zinc-950 to-black' },
];

export default function BannerManager({ isAdmin, onClose }: BannerManagerProps) {
  const [bannersList, setBannersList] = useState<BannerAd[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerAd | null>(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<BannerAd | null>(null);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);
  const [previewingModalBanner, setPreviewingModalBanner] = useState<BannerAd | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Banner Form States
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [badge, setBadge] = useState("تبلیغات ویژه");
  const [badgeColor, setBadgeColor] = useState<BannerAd['badgeColor']>('amber');
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("استعلام قیمت و کاتالوگ");
  const [themeColor, setThemeColor] = useState<BannerAd['themeColor']>('dark');
  const [overlayOpacity, setOverlayOpacity] = useState<BannerAd['overlayOpacity']>('medium');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [priority, setPriority] = useState<number>(1);
  const [placement, setPlacement] = useState<BannerAd['placement']>('hero_slider');
  const [expiresAt, setExpiresAt] = useState("");

  // Media
  const [image, setImage] = useState("");
  const [logo, setLogo] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const bgImgInputRef = useRef<HTMLInputElement>(null);
  const logoImgInputRef = useRef<HTMLInputElement>(null);

  const getHeaders = () => {
    const savedUser = localStorage.getItem("custom_auth_user");
    let tokenHeaders: Record<string, string> = {};
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.token) {
        tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
      }
    }
    return tokenHeaders;
  };

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const res = await fetch("/api/banners");
      if (res.ok) {
        const data = await res.json().catch(() => []);
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

  const resetForm = () => {
    setEditingBanner(null);
    setCompanyName("");
    setTitle("");
    setSubtitle("");
    setDescription("");
    setBadge("تبلیغات ویژه");
    setBadgeColor("amber");
    setPhone("");
    setMobile("");
    setLinkUrl("");
    setLinkText("استعلام قیمت و کاتالوگ");
    setThemeColor("dark");
    setOverlayOpacity("medium");
    setStatus("active");
    setPriority(1);
    setPlacement("hero_slider");
    setExpiresAt("");
    setImage("");
    setLogo("");
    setUploadError("");
  };

  const startAddingNew = () => {
    resetForm();
    setIsAddingBanner(true);
  };

  const startEditing = (ad: BannerAd) => {
    setEditingBanner(ad);
    setCompanyName(ad.companyName || "");
    setTitle(ad.title || "");
    setSubtitle(ad.subtitle || "");
    setDescription(ad.description || "");
    setBadge(ad.badge || "تبلیغات ویژه");
    setBadgeColor(ad.badgeColor || "amber");
    setPhone(ad.phone || "");
    setMobile(ad.mobile || "");
    setLinkUrl(ad.linkUrl || "");
    setLinkText(ad.linkText || "استعلام قیمت و کاتالوگ");
    setThemeColor(ad.themeColor || "dark");
    setOverlayOpacity(ad.overlayOpacity || "medium");
    setStatus(ad.status || "active");
    setPriority(ad.priority || 1);
    setPlacement(ad.placement || "hero_slider");
    setExpiresAt(ad.expiresAt || "");
    setImage(ad.image || "");
    setLogo(ad.logo || "");
    setUploadError("");
    setIsAddingBanner(true);
  };

  const duplicateBanner = (ad: BannerAd) => {
    setEditingBanner(null);
    setCompanyName(`${ad.companyName} (کپی)`);
    setTitle(ad.title || "");
    setSubtitle(ad.subtitle || "");
    setDescription(ad.description || "");
    setBadge(ad.badge || "تبلیغات ویژه");
    setBadgeColor(ad.badgeColor || "amber");
    setPhone(ad.phone || "");
    setMobile(ad.mobile || "");
    setLinkUrl(ad.linkUrl || "");
    setLinkText(ad.linkText || "استعلام قیمت و کاتالوگ");
    setThemeColor(ad.themeColor || "dark");
    setOverlayOpacity(ad.overlayOpacity || "medium");
    setStatus("active");
    setPriority((ad.priority || 1) + 1);
    setPlacement(ad.placement || "hero_slider");
    setExpiresAt(ad.expiresAt || "");
    setImage(ad.image || "");
    setLogo(ad.logo || "");
    setUploadError("");
    setIsAddingBanner(true);
    toast.success("اطلاعات بنر در فرم کپی شد. پس از بازبینی ذخیره کنید.");
  };

  // Upload handler for background image
  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setImageUploading(true);

    const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
    if (file.size > MAX_SIZE) {
      setUploadError("حجم تصویر بنر بیش از حد مجاز (۱۵ مگابایت) است.");
      toast.error("حجم تصویر بنر نباید بیشتر از ۱۵ مگابایت باشد.");
      setImageUploading(false);
      return;
    }

    try {
      const compressedFile = await compressImage(file, 0.5, 1400);
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
            toast.success("تصویر پس‌زمینه با موفقیت بارگذاری شد.");
          } else {
            throw new Error(data.error || "آپلود ناموفق بود");
          }
        } catch (innerErr: any) {
          setUploadError(innerErr.message || "خطا در ذخیره‌سازی تصویر در سرور.");
          toast.error("خطا در آپلود تصویر.");
        } finally {
          setImageUploading(false);
        }
      };
    } catch (err: any) {
      setUploadError("خطا در پردازش فایل تصویر.");
      toast.error("خطا در پردازش فایل تصویر.");
      setImageUploading(false);
    }
  };

  // Upload handler for sponsor logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const compressedFile = await compressImage(file, 0.4, 800);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = async () => {
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: reader.result, fileName: `logo_${file.name}` })
          });
          const data = await response.json();
          if (response.ok && data.url) {
            setLogo(data.url);
            toast.success("لوگوی حامی با موفقیت اضافه شد.");
          } else {
            throw new Error(data.error || "آپلود ناموفق بود");
          }
        } catch (innerErr: any) {
          toast.error(innerErr.message || "خطا در آپلود لوگو.");
        } finally {
          setLogoUploading(false);
        }
      };
    } catch (err: any) {
      toast.error("خطا در پردازش لوگو.");
      setLogoUploading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !title.trim() || !description.trim() || !phone.trim()) {
      toast.error("لطفا فیلدهای ستاره‌دار (نام شرکت، عنوان، توضیحات و تلفن) را تکمیل کنید.");
      return;
    }
    if (!image) {
      toast.error("لطفا تصویر پس‌زمینه بنر را بارگذاری کنید.");
      return;
    }

    setSavingBanner(true);
    const headers = {
      ...getHeaders(),
      "Content-Type": "application/json"
    };

    const payload: BannerAd = {
      id: editingBanner?.id || `ad_${Date.now()}`,
      companyName: companyName.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      image,
      logo: logo || undefined,
      badge: badge.trim() || "تبلیغات ویژه",
      badgeColor,
      phone: phone.trim(),
      mobile: mobile.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      linkText: linkText.trim() || undefined,
      themeColor,
      overlayOpacity,
      status,
      priority: Number(priority) || 1,
      placement,
      expiresAt: expiresAt || undefined,
      createdAt: editingBanner?.createdAt || new Date().toISOString()
    };

    try {
      const res = await fetch("/api/banners", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(editingBanner ? "بنر تبلیغاتی با موفقیت به‌روزرسانی شد." : "بنر تبلیغاتی جدید با موفقیت ثبت و منتشر گردید.");
        setIsAddingBanner(false);
        resetForm();
        fetchBanners();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "خطا در ذخیره بنر.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleStatus = async (ad: BannerAd) => {
    const nextStatus = ad.status === 'inactive' ? 'active' : 'inactive';
    try {
      const res = await fetch(`/api/banners/${ad.id}/status`, {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        toast.success(`وضعیت بنر «${ad.companyName}» به ${nextStatus === 'active' ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
        fetchBanners();
      } else {
        toast.error("خطا در تغییر وضعیت بنر.");
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور.");
    }
  };

  const handleExecuteDelete = async () => {
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
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setIsDeletingBanner(false);
    }
  };

  // Filtered banners
  const filteredBanners = bannersList.filter(b => {
    const matchesSearch = !searchQuery.trim() || 
      b.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.badge?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && b.status !== 'inactive') ||
      (statusFilter === 'inactive' && b.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

  const activeCount = bannersList.filter(b => b.status !== 'inactive').length;
  const inactiveCount = bannersList.filter(b => b.status === 'inactive').length;

  // Selected Badge Color config
  const selectedBadgeObj = BADGE_COLORS.find(c => c.id === badgeColor) || BADGE_COLORS[0];
  const selectedThemeObj = THEME_PRESETS.find(t => t.id === themeColor) || THEME_PRESETS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-8 space-y-6 text-right mb-8"
      style={{ direction: "rtl" }}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-800">
                مدیریت جامع بنرهای تبلیغاتی و حامیان صنعتی
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                کنترل کامل بر جزئیات بصری، متون، لوگو، تم رنگی، دکمه‌های اقدام و اولویت نمایش اسلایدر
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (isAddingBanner) {
                setIsAddingBanner(false);
                resetForm();
              } else {
                startAddingNew();
              }
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
          >
            {isAddingBanner ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isAddingBanner ? "بستن فرم ویرایش" : "ایجاد بنر تبلیغاتی جدید"}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              title="بستن بخش"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
          <span className="text-[11px] font-bold text-slate-500">کل بنرها</span>
          <div className="text-xl font-black text-slate-800">{bannersList.length}</div>
        </div>
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700">بنرهای فعال</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{activeCount}</div>
        </div>
        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700">غیرفعال / آرشیو</span>
            <XCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700">{inactiveCount}</div>
        </div>
        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700">جایگاه اصلی</span>
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xs font-extrabold text-indigo-900 mt-1">اسلایدر هدر صفحه اول</div>
        </div>
      </div>

      {/* Adding / Editing Form with Live Real-Time Preview */}
      <AnimatePresence>
        {isAddingBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 sm:p-7 bg-slate-50/90 rounded-3xl border border-indigo-100 space-y-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <h4 className="text-sm font-black text-indigo-950">
                  {editingBanner ? `ویرایش بنر تبلیغاتی: ${editingBanner.companyName}` : "تنظیم و انتشار بنر تبلیغاتی جدید"}
                </h4>
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                پیش‌نمایش زنده در پایین فرم فعال است
              </span>
            </div>

            {uploadError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBanner} className="space-y-6">
              {/* SECTION 1: Identity & Texts */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 border-b border-slate-100 pb-2">
                  <Edit3 className="h-4 w-4 text-indigo-600" />
                  <span>۱. عناوین، هویت و متون بنر</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>نام شرکت یا برند حامی <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: صنایع پتروشیمی البرز"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      برچسب ویژه (Badge) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تامین‌کننده طلایی، تخفیف فصلی"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      رنگ و تم برچسب (Badge Color)
                    </label>
                    <select
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      {BADGE_COLORS.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700">
                      عنوان اصلی تبلیغ (Main Title) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تولید و تامین بی‌واسطه لوله‌های صنعتی با استاندارد ملی"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-black text-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      شعار فرعی یا مزیت رقابتی (اختیاری)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: تحویل ۲۴ ساعته در شهرک صنعتی"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700">
                      توضیحات تکمیلی و آفرها <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="توضیحات جامع درباره تخفیف‌ها، گارانتی، کاتالوگ یا توانمندی‌ها جهت نمایش به بازدیدکنندگان..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Media, Logo & Visual Aesthetics */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 border-b border-slate-100 pb-2">
                  <Palette className="h-4 w-4 text-indigo-600" />
                  <span>۲. تصویر، لوگو و تم گرافیکی بنر</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Background Image Upload */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700">
                      تصویر پس‌زمینه بنر <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-20 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                        {image ? (
                          <img src={image} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        ref={bgImgInputRef}
                        accept="image/*"
                        onChange={handleBgImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bgImgInputRef.current?.click()}
                        disabled={imageUploading}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {imageUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                        <span>{image ? "تغییر تصویر" : "آپلود تصویر بنر"}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">
                      ابعاد مناسب: عریض (۱۶:۹ یا ۱۲۰۰×۴۰۰) • حداکثر ۹۰۰ کیلوبایت
                    </p>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700">
                      لوگوی اختصاصی شرکت (اختیاری)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                        {logo ? (
                          <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Sparkles className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        ref={logoImgInputRef}
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => logoImgInputRef.current?.click()}
                          disabled={logoUploading}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          <span>{logo ? "تغییر لوگو" : "آپلود لوگو"}</span>
                        </button>
                        {logo && (
                          <button
                            type="button"
                            onClick={() => setLogo("")}
                            className="text-[10px] text-rose-500 hover:underline block font-bold cursor-pointer"
                          >
                            حذف لوگو
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Theme Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">تم و رنگ‌بندی پایه بنر</label>
                    <select
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      {THEME_PRESETS.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Overlay Opacity */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">میزان تیرگی لایه روی تصویر</label>
                    <select
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      <option value="light">کم (وضوح بیشتر تصویر)</option>
                      <option value="medium">متعادل و خوانا (پیشنهادی)</option>
                      <option value="heavy">عمیق و با کنتراست بالا</option>
                    </select>
                  </div>

                  {/* Priority / Order */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">اولویت نمایش در اسلایدر</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={priority}
                        onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                      />
                      <span className="text-[11px] text-slate-400 shrink-0 font-medium">۱ = اولین اسلاید</span>
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">وضعیت انتشار بنر</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold cursor-pointer"
                    >
                      <option value="active">فعال و در حال نمایش در سایت</option>
                      <option value="inactive">غیرفعال (مخفی در سایت)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Contact & Action Buttons (CTA) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 border-b border-slate-100 pb-2">
                  <Phone className="h-4 w-4 text-indigo-600" />
                  <span>۳. راه‌های ارتباطی و دکمه‌های اقدام (Call To Action)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      تلفن تماس ثابت <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ۰۲۱-۸۸۸۸۸۸۸۸"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono font-bold text-left"
                      style={{ direction: "ltr" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      شماره موبایل / واتساپ
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono font-bold text-left"
                      style={{ direction: "ltr" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      لینک اختصاصی وب‌سایت یا کاتالوگ
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono font-medium text-left"
                      style={{ direction: "ltr" }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      عنوان دکمه اقدام (CTA Label)
                    </label>
                    <input
                      type="text"
                      placeholder="استعلام قیمت، کاتالوگ و..."
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: LIVE INTERACTIVE PREVIEW */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-indigo-600" />
                    <span>پیش‌نمایش زنده بنر (نمایش واقعی در سایت)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    همگام‌سازی لحظه‌ای با ورودی‌های شما
                  </span>
                </div>

                <div className="relative min-h-[185px] sm:h-52 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                  {/* Background overlay & theme gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${selectedThemeObj.bgClass} z-10 opacity-95`} />

                  <div className="absolute inset-0 flex flex-row items-stretch justify-between z-20">
                    {/* Visual Image Section */}
                    <div className="relative w-1/3 sm:w-2/5 h-full overflow-hidden shrink-0">
                      <div className={`absolute inset-0 bg-gradient-to-r from-slate-950 ${
                        overlayOpacity === 'light' ? 'via-slate-950/20' : overlayOpacity === 'heavy' ? 'via-slate-950/80' : 'via-slate-950/45'
                      } to-transparent z-10`} />
                      {image ? (
                        <img
                          src={image}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600 text-xs font-bold">
                          تصویر بنر
                        </div>
                      )}
                    </div>

                    {/* Info Content Section */}
                    <div className="w-2/3 sm:w-3/5 p-3 sm:p-5 flex flex-col justify-between text-right text-white relative z-20">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border ${selectedBadgeObj.bg} ${selectedBadgeObj.text} ${selectedBadgeObj.border}`}>
                            {badge || "تبلیغات ویژه"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {logo && (
                              <img src={logo} alt="Logo" className="h-4 w-4 rounded object-contain bg-white/10" />
                            )}
                            <span className="text-[10px] sm:text-xs text-slate-300 font-bold truncate max-w-[150px]">
                              {companyName || "نام شرکت / حامی صنعتی"}
                            </span>
                          </div>
                          {subtitle && (
                            <span className="text-[10px] text-amber-300 font-medium hidden sm:inline">
                              • {subtitle}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-1 sm:line-clamp-2">
                          {title || "عنوان اصلی و شعار تبلیغاتی بنر در این قسمت قرار می‌گیرد"}
                        </h4>

                        <p className="text-[10px] sm:text-xs text-slate-400 font-normal leading-relaxed line-clamp-2">
                          {description || "توضیحات خدمات، کاتالوگ، تخفیف‌ها و شرایط ویژه همکاری با این حامی صنعتی در این کادر نمایش داده می‌شود..."}
                        </p>
                      </div>

                      {/* CTA & Contact Bar in Preview */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-slate-300 truncate">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span className="font-mono font-bold" style={{ direction: "ltr" }}>
                              {phone || "۰۲۱-XXXXXXXX"}
                            </span>
                          </div>
                          {mobile && (
                            <div className="hidden sm:flex items-center gap-1 text-slate-400 font-mono">
                              <Smartphone className="h-3 w-3 text-cyan-400" />
                              <span style={{ direction: "ltr" }}>{mobile}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {linkUrl && (
                            <span className="px-2.5 py-1 bg-indigo-600 text-white text-[9px] sm:text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm">
                              <span>{linkText || "مشاهده"}</span>
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          )}
                          <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[9px] font-bold rounded-lg">
                            جزئیات
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingBanner || imageUploading || logoUploading}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:bg-slate-300"
                >
                  {savingBanner ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>در حال ذخیره‌سازی...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingBanner ? "ذخیره تغییرات بنر" : "ثبت و انتشار رسمی بنر"}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBanner(false);
                    resetForm();
                  }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar for Banners List */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="جستجو در نام شرکت، عنوان بنر یا تلفن..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه ({bannersList.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            فعال ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'inactive' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            غیرفعال ({inactiveCount})
          </button>
          <button
            onClick={fetchBanners}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="تازه‌سازی لیست"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Banners Grid / List */}
      <div className="space-y-3">
        {bannersLoading ? (
          <div className="flex items-center justify-center p-12 text-indigo-600">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Megaphone className="h-8 w-8 text-slate-300 mx-auto" />
            <p>هیچ بنر تبلیغاتی متناسب با فیلتر شما یافت نشد.</p>
            <button
              onClick={startAddingNew}
              className="mt-2 text-indigo-600 hover:underline inline-block font-bold cursor-pointer"
            >
              افزودن اولین بنر
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBanners.map((ad, idx) => {
              const badgeStyle = BADGE_COLORS.find(c => c.id === ad.badgeColor) || BADGE_COLORS[0];
              const isActive = ad.status !== 'inactive';

              return (
                <div
                  key={`${ad.id}-${idx}`}
                  className={`p-4 rounded-2xl border transition-all text-right space-y-3 ${
                    isActive 
                      ? 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm' 
                      : 'bg-slate-50/80 border-slate-200 opacity-75'
                  }`}
                >
                  {/* Top Bar inside Card */}
                  <div className="flex items-start gap-3">
                    <div className="h-20 w-24 rounded-xl overflow-hidden shrink-0 border border-slate-200 relative bg-slate-900">
                      <img src={ad.image} alt={ad.companyName} className="h-full w-full object-cover" loading="lazy" />
                      {ad.logo && (
                        <img
                          src={ad.logo}
                          alt="Logo"
                          className="absolute bottom-1 right-1 h-5 w-5 bg-white/90 rounded p-0.5 object-contain shadow-xs"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                            {ad.badge}
                          </span>
                          <span className="text-xs font-black text-slate-800 truncate max-w-[140px]">
                            {ad.companyName}
                          </span>
                        </div>

                        {/* Priority Badge */}
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded" title="اولویت نمایش">
                          نوبت: {ad.priority || 1}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                        {ad.title}
                      </h5>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
                        {ad.description}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info & Direct Links */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        <span style={{ direction: "ltr" }}>{ad.phone}</span>
                      </div>
                      {ad.mobile && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Smartphone className="h-3 w-3 text-cyan-600" />
                          <span style={{ direction: "ltr" }}>{ad.mobile}</span>
                        </div>
                      )}
                    </div>

                    {ad.linkUrl && (
                      <a
                        href={ad.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Globe className="h-3 w-3" />
                        <span>{ad.linkText || "لینک وب‌سایت"}</span>
                      </a>
                    )}
                  </div>

                  {/* Management & Action Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 p-3 rounded-b-2xl">
                    {/* Status Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(ad)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                          isActive 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title="کلیک برای فعال/غیرفعال کردن نمایش در سایت"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                        <span>{isActive ? 'فعال در سایت' : 'غیرفعال (مخفی)'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Modal Preview */}
                      <button
                        type="button"
                        onClick={() => setPreviewingModalBanner(ad)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                        title="پیش‌نمایش در ابعاد واقعی"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => duplicateBanner(ad)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                        title="کپی و ساخت بنر جدید مشابه"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => startEditing(ad)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="ویرایش کامل اجزای بنر"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setBannerToDelete(ad)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف بنر"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-sm w-full p-6 shadow-2xl text-center space-y-4"
          >
            <div className="mx-auto h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-sm">حذف بنر تبلیغاتی</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا از حذف بنر تبلیغاتی شرکت «{bannerToDelete.companyName}» اطمینان دارید؟ این عمل غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExecuteDelete}
                disabled={isDeletingBanner}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:bg-slate-300"
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

      {/* Modal Preview Dialog */}
      {previewingModalBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-2xl w-full overflow-hidden shadow-2xl space-y-4 p-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-800">
                پیش‌نمایش بزرگ بنر: {previewingModalBanner.companyName}
              </h4>
              <button
                onClick={() => setPreviewingModalBanner(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Simulated Banner */}
            <div className="relative min-h-[190px] sm:h-56 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
              <div className="absolute inset-0 flex flex-row items-stretch justify-between z-20">
                <div className="relative w-1/3 sm:w-2/5 h-full overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent z-10" />
                  <img
                    src={previewingModalBanner.image}
                    alt={previewingModalBanner.companyName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="w-2/3 sm:w-3/5 p-4 sm:p-6 flex flex-col justify-between text-right text-white relative z-20">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                        {previewingModalBanner.badge}
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        {previewingModalBanner.companyName}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-black text-white leading-snug">
                      {previewingModalBanner.title}
                    </h4>

                    <p className="text-xs text-slate-400 font-normal leading-relaxed">
                      {previewingModalBanner.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-mono font-bold" style={{ direction: "ltr" }}>
                        {previewingModalBanner.phone}
                      </span>
                    </div>

                    {previewingModalBanner.linkUrl && (
                      <a
                        href={previewingModalBanner.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <span>{previewingModalBanner.linkText || "بازدید وب‌سایت"}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewingModalBanner(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                بستن
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
