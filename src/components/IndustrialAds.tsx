import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Megaphone, 
  ChevronRight, 
  ChevronLeft, 
  Phone, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Globe,
  X
} from "lucide-react";
import { BannerSkeleton } from "./Skeleton";
import { BannerAd } from "../types";

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  violet: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  slate: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
};

const THEME_GRADIENTS: Record<string, string> = {
  dark: 'from-slate-950 via-slate-900 to-slate-950',
  navy: 'from-slate-950 via-blue-950 to-slate-950',
  emerald: 'from-slate-950 via-emerald-950 to-slate-950',
  amber: 'from-slate-950 via-amber-950/70 to-slate-950',
  carbon: 'from-black via-zinc-950 to-black',
};

const DEFAULT_BANNERS: BannerAd[] = [
  {
    id: "ad1",
    companyName: "صنایع پلیمر البرز",
    title: "تولید انواع لوله‌های پلی‌اتیلن و اتصالات پی‌وی‌سی",
    subtitle: "تضمین کیفیت با گارانتی ۱۰ ساله تعویض",
    description: "بزرگترین تامین‌کننده تخصصی لوله‌های صنعتی و ساختمانی با گارانتی ۱۰ ساله تعویض و بالاترین استانداردهای کیفیت ملی.",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
    badge: "تامین‌کننده طلایی",
    badgeColor: "amber",
    phone: "۰۲۱-۸۸۸۸۸۸۸۸",
    mobile: "۰۹۱۲۱۱۱۱۱۱۱",
    linkText: "استعلام قیمت",
    status: "active"
  },
  {
    id: "ad2",
    companyName: "برنا الکترونیک دماوند",
    title: "طراحی و ساخت ترانسفورماتورهای قدرت و تابلو برق صنعتی",
    subtitle: "تجهیزات پست برق فشار قوی و ضعیف",
    description: "تولیدکننده نمونه تجهیزات پست برق، تابلوهای فرمان فشار قوی و ضعیف ویژه کارخانجات و کارگاه‌های تولیدی.",
    image: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80&w=800",
    badge: "صنعت هوشمند",
    badgeColor: "cyan",
    phone: "۰۲۱-۷۷۷۷۷۷۷۷",
    mobile: "۰۹۱۲۲۲۲۲۲۲۲",
    linkText: "مشاهده کاتالوگ",
    status: "active"
  },
  {
    id: "ad3",
    companyName: "فولاد آذرخش پایتخت",
    title: "فروش مستقیم تیرآهن، پروفیل و انواع ورق‌های ساختمانی",
    subtitle: "ارسال سریع به سراسر کشور با فاکتور رسمی",
    description: "تامین و ارسال مقاطع فولادی سنگین، قوطی، نبشی و ناودانی به سراسر پروژه‌های صنعتی کشور با فاکتور رسمی.",
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800",
    badge: "فروش ویژه همکار",
    badgeColor: "emerald",
    phone: "۰۲۱-۶۶۶۶۶۶۶۶",
    mobile: "۰۹۱۲۳۳۳۳۳۳۳",
    linkText: "ثبت سفارش",
    status: "active"
  }
];

export default function IndustrialAds() {
  const [bannersList, setBannersList] = useState<BannerAd[]>(DEFAULT_BANNERS);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAdRequestOpen, setIsAdRequestOpen] = useState(false);
  const [activePromoAd, setActivePromoAd] = useState<BannerAd | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [adMessage, setAdMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load banners from database
  useEffect(() => {
    fetch("/api/banners")
      .then(async (res) => {
        if (!res.ok) return [];
        return res.json().catch(() => []);
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Filter only active banners and sort by priority
          const activeOnly = data.filter(b => b.status !== 'inactive');
          if (activeOnly.length > 0) {
            setBannersList(activeOnly);
          }
        }
      })
      .catch((err) => console.error("Error fetching banners:", err))
      .finally(() => setLoading(false));
  }, []);

  // Auto scroll slides
  useEffect(() => {
    if (bannersList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannersList.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [bannersList.length]);

  const handleNext = () => {
    if (bannersList.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % bannersList.length);
  };

  const handlePrev = () => {
    if (bannersList.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + bannersList.length) % bannersList.length);
  };

  const handleSubmitAdRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !companyName) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSubmitting(false);
    setIsSubmitted(true);
  };

  const handleResetForm = () => {
    setFullName("");
    setCompanyName("");
    setPhone("");
    setAdMessage("");
    setIsSubmitted(false);
    setIsAdRequestOpen(false);
  };

  return (
    <div className="w-full space-y-4" style={{ direction: "rtl" }}>
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Megaphone className="h-4 w-4 text-amber-500 animate-bounce" />
          <h3 className="text-xs font-black text-slate-800">جایگاه ویژه تبلیغات و حامیان صنعتی</h3>
        </div>
        <button
          onClick={() => setIsAdRequestOpen(true)}
          className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Sparkles className="h-3 w-3" />
          <span>رزرو بنر تبلیغاتی شما</span>
        </button>
      </div>

      {/* Main Banner Slider Area */}
      {loading ? (
        <BannerSkeleton />
      ) : (
        <div className="relative min-h-[175px] sm:h-48 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 group shadow-md">
          <AnimatePresence mode="wait">
            {bannersList[currentSlide] && (() => {
              const ad = bannersList[currentSlide];
              const badgeStyle = BADGE_COLORS[ad.badgeColor || 'amber'] || BADGE_COLORS.amber;
              const themeClass = THEME_GRADIENTS[ad.themeColor || 'dark'] || THEME_GRADIENTS.dark;
              const overlayClass = ad.overlayOpacity === 'light' 
                ? 'via-slate-950/20' 
                : ad.overlayOpacity === 'heavy' 
                ? 'via-slate-950/80' 
                : 'via-slate-950/45';

              return (
                <motion.div
                  key={`${ad.id}-${currentSlide}`}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-row items-stretch justify-between"
                >
                  {/* Background overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${themeClass} z-10 opacity-95 pointer-events-none`} />

                  {/* Visual Image Background / Left side */}
                  <div className="relative w-1/3 sm:w-2/5 h-full overflow-hidden shrink-0 z-10">
                    <div className={`absolute inset-0 bg-gradient-to-r from-slate-950 ${overlayClass} to-transparent z-10`} />
                    <img
                      src={ad.image}
                      alt={ad.companyName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transform hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                  </div>

                  {/* Info Text Right side */}
                  <div className="w-2/3 sm:w-3/5 p-3 sm:p-5 flex flex-col justify-between z-20 text-right text-white relative">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                          {ad.badge}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ad.logo && (
                            <img src={ad.logo} alt="Logo" className="h-4 w-4 rounded object-contain bg-white/10" />
                          )}
                          <span className="text-[10px] sm:text-xs text-slate-300 font-bold truncate max-w-[130px] sm:max-w-none">
                            {ad.companyName}
                          </span>
                        </div>
                        {ad.subtitle && (
                          <span className="text-[10px] text-amber-300 font-medium hidden sm:inline">
                            • {ad.subtitle}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-1 sm:line-clamp-2">
                        {ad.title}
                      </h4>

                      <p className="text-[10px] sm:text-xs text-slate-400 font-normal leading-relaxed line-clamp-2 sm:line-clamp-3">
                        {ad.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-800 gap-2">
                      <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-slate-300 truncate">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400 shrink-0" />
                          <span className="font-bold hidden xs:inline">تماس:</span>
                          <a href={`tel:${ad.phone}`} className="font-mono hover:text-emerald-300 font-bold tracking-wider" style={{ direction: "ltr" }}>
                            {ad.phone}
                          </a>
                        </div>
                        {ad.mobile && (
                          <div className="hidden md:flex items-center gap-1 text-slate-400 font-mono">
                            <Smartphone className="h-3 w-3 text-cyan-400" />
                            <a href={`tel:${ad.mobile}`} className="hover:text-cyan-300" style={{ direction: "ltr" }}>
                              {ad.mobile}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {ad.linkUrl && (
                          <a
                            href={ad.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] sm:text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                          >
                            <span>{ad.linkText || "مشاهده کاتالوگ"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          onClick={() => setActivePromoAd(ad)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] sm:text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                        >
                          جزئیات
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer border border-slate-800"
            title="قبلی"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer border border-slate-800"
            title="بعدی"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30">
            {bannersList.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? "w-4 bg-indigo-500" : "w-1.5 bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Banner ad detail Modal */}
      {activePromoAd && (() => {
        const badgeStyle = BADGE_COLORS[activePromoAd.badgeColor || 'amber'] || BADGE_COLORS.amber;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="h-48 bg-slate-950 relative overflow-hidden">
                <img
                  src={activePromoAd.image}
                  alt={activePromoAd.companyName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                    {activePromoAd.badge}
                  </span>
                </div>

                <div className="absolute bottom-3 right-4 left-4 flex items-center gap-2 text-white">
                  {activePromoAd.logo && (
                    <img src={activePromoAd.logo} alt="Logo" className="h-7 w-7 rounded-lg object-contain bg-white/90 p-0.5" />
                  )}
                  <div>
                    <span className="text-xs font-black text-white">{activePromoAd.companyName}</span>
                    {activePromoAd.subtitle && (
                      <p className="text-[10px] text-amber-300 font-medium">{activePromoAd.subtitle}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 text-right">
                <div>
                  <h3 className="text-sm font-black text-slate-800 leading-snug">{activePromoAd.title}</h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed text-justify bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {activePromoAd.description}
                </p>

                {/* Direct Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center justify-between text-emerald-800">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Phone className="h-4 w-4" />
                      <span className="font-extrabold">تلفن دفتر:</span>
                    </div>
                    <a href={`tel:${activePromoAd.phone}`} className="text-xs font-bold font-mono tracking-wider hover:underline" style={{ direction: "ltr" }}>
                      {activePromoAd.phone}
                    </a>
                  </div>

                  {activePromoAd.mobile && (
                    <div className="bg-cyan-50 border border-cyan-100 p-3.5 rounded-xl flex items-center justify-between text-cyan-800">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Smartphone className="h-4 w-4" />
                        <span className="font-extrabold">موبایل / پشتیبانی:</span>
                      </div>
                      <a href={`tel:${activePromoAd.mobile}`} className="text-xs font-bold font-mono tracking-wider hover:underline" style={{ direction: "ltr" }}>
                        {activePromoAd.mobile}
                      </a>
                    </div>
                  )}
                </div>

                {activePromoAd.linkUrl && (
                  <div className="pt-1">
                    <a
                      href={activePromoAd.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Globe className="h-4 w-4" />
                      <span>{activePromoAd.linkText || "مشاهده وب‌سایت یا کاتالوگ آنلاین"}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActivePromoAd(null)}
                  className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Register / Place Banner Advertisement Dialog Modal */}
      {isAdRequestOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-md w-full overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-indigo-900 text-white p-5 space-y-1 relative">
              <h3 className="font-black text-sm flex items-center gap-1.5">
                <Megaphone className="h-4 w-4 text-amber-400" />
                <span>ثبت سفارش و رزرو بنر تبلیغاتی</span>
              </h3>
              <p className="text-[10px] text-indigo-200 leading-relaxed">
                برند، کالاها و خدمات ویژه خود را در پربازدیدترین صفحات شهرک صنعتی به نمایش بگذارید.
              </p>
            </div>

            {/* Modal Body / Form */}
            <div className="p-6">
              {!isSubmitted ? (
                <form onSubmit={handleSubmitAdRequest} className="space-y-4 text-right">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">نام و نام خانوادگی رابط:</label>
                    <input
                      type="text"
                      required
                      placeholder="مانند: علیرضا محمدی"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">نام واحد صنعتی / شرکت:</label>
                    <input
                      type="text"
                      required
                      placeholder="مانند: صنایع فلزی آذرخش البرز"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">شماره تلفن همراه جهت هماهنگی:</label>
                    <input
                      type="tel"
                      required
                      placeholder="مانند: ۰۹۱۲۳۴۵۶۷۸۹"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">توضیحات یا متن بنر پیشنهادی (اختیاری):</label>
                    <textarea
                      rows={3}
                      placeholder="شرح کوتاه خدمات، محصول یا پیشنهادی که مایلید روی بنر نمایش داده شود..."
                      value={adMessage}
                      onChange={(e) => setAdMessage(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? "در حال ثبت..." : "ارسال درخواست و هماهنگی"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdRequestOpen(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-sm">درخواست شما با موفقیت ثبت شد</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                      همکاران ما به زودی جهت هماهنگی، ارسال طرح بنر و جزئیات قرارگیری جایگاه با شماره <strong className="font-mono text-indigo-600 font-black">{phone}</strong> تماس خواهند گرفت.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleResetForm}
                      className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      تایید و بستن پنجره
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
