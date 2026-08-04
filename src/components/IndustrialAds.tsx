import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, ChevronRight, ChevronLeft, Phone, Info, CheckCircle2, MessageSquare, Sparkles } from "lucide-react";
import { BannerSkeleton } from "./Skeleton";

interface BannerAd {
  id: string;
  title: string;
  description: string;
  image: string;
  badge: string;
  phone: string;
  companyName: string;
}

const AD_BANNERS: BannerAd[] = [
  {
    id: "ad1",
    companyName: "صنایع پلیمر البرز",
    title: "تولید انواع لوله‌های پلی‌اتیلن و اتصالات پی‌وی‌سی",
    description: "بزرگترین تامین‌کننده تخصصی لوله‌های صنعتی و ساختمانی با گارانتی ۱۰ ساله تعویض و بالاترین استانداردهای کیفیت ملی.",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
    badge: "تامین‌کننده طلایی",
    phone: "۰۲۱-۸۸۸۸۸۸۸۸"
  },
  {
    id: "ad2",
    companyName: "برنا الکترونیک دماوند",
    title: "طراحی و ساخت ترانسفورماتورهای قدرت و تابلو برق صنعتی",
    description: "تولیدکننده نمونه تجهیزات پست برق، تابلوهای فرمان فشار قوی و ضعیف ویژه کارخانجات و کارگاه‌های تولیدی.",
    image: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80&w=800",
    badge: "صنعت هوشمند",
    phone: "۰۲۱-۷۷۷۷۷۷۷۷"
  },
  {
    id: "ad3",
    companyName: "فولاد آذرخش پایتخت",
    title: "فروش مستقیم تیرآهن، پروفیل و انواع ورق‌های ساختمانی",
    description: "تامین و ارسال مقاطع فولادی سنگین، قوطی، نبشی و ناودانی به سراسر پروژه‌های صنعتی کشور با فاکتور رسمی.",
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800",
    badge: "فروش ویژه همکار",
    phone: "۰۲۱-۶۶۶۶۶۶۶۶"
  }
];

export default function IndustrialAds() {
  const [bannersList, setBannersList] = useState<BannerAd[]>(AD_BANNERS);
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
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBannersList(data);
        }
      })
      .catch((err) => console.error("Error fetching banners:", err))
      .finally(() => setLoading(false));
  }, []);

  // Auto scroll slides
  useEffect(() => {
    if (bannersList.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannersList.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [bannersList]);

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
    // Simulate real database store or request
    await new Promise((resolve) => setTimeout(resolve, 1500));
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
        <div className="relative h-44 sm:h-48 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 group shadow-md">
          <AnimatePresence mode="wait">
            {bannersList[currentSlide] && (() => {
              const ad = bannersList[currentSlide];
              return (
                <motion.div
                  key={`${ad.id}-${currentSlide}`}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex flex-col md:flex-row items-stretch justify-between"
                >
                  {/* Visual Image Background / Left side */}
                  <div className="relative w-full md:w-2/5 h-1/2 md:h-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r md:bg-gradient-to-l from-slate-950 via-slate-950/60 to-transparent z-10" />
                    <img
                      src={ad.image}
                      alt={ad.companyName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transform hover:scale-105 transition-all duration-700"
                      loading="lazy"
                    />
                  </div>

                  {/* Info Text Right side */}
                  <div className="w-full md:w-3/5 p-4 sm:p-5 flex flex-col justify-between z-20 text-right bg-slate-950 text-white relative">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                          {ad.badge}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{ad.companyName}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                        {ad.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-normal leading-relaxed line-clamp-2 md:line-clamp-3">
                        {ad.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-bold">تلفن هماهنگی:</span>
                        <a href={`tel:${ad.phone}`} className="font-mono hover:text-emerald-300 font-bold tracking-wider">
                          {ad.phone}
                        </a>
                      </div>
                      <button
                        onClick={() => setActivePromoAd(ad)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        جزئیات کامل
                      </button>
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
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer border border-slate-800"
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
      {activePromoAd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-md w-full overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="h-44 bg-slate-100 relative overflow-hidden">
              <img
                src={activePromoAd.image}
                alt={activePromoAd.companyName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute top-4 right-4 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded">
                {activePromoAd.badge}
              </span>
            </div>
            <div className="p-6 space-y-4 text-right">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold">{activePromoAd.companyName}</span>
                <h3 className="text-sm font-black text-slate-800 mt-1 leading-snug">{activePromoAd.title}</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed text-justify bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {activePromoAd.description}
              </p>

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between text-emerald-800">
                <div className="flex items-center gap-1.5 text-xs">
                  <Phone className="h-4 w-4" />
                  <span className="font-extrabold">شماره تماس مستقیم:</span>
                </div>
                <a href={`tel:${activePromoAd.phone}`} className="text-sm font-bold font-mono tracking-wider hover:underline">
                  {activePromoAd.phone}
                </a>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActivePromoAd(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                بستن
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold font-mono"
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
