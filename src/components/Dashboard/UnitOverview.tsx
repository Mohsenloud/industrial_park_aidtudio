import React from "react";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Smartphone, 
  Edit3, 
  Navigation, 
  Globe,
  Mail,
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Unit, CATEGORIES } from "../../types";

interface UnitOverviewProps {
  unit: Unit;
  onEditClick: () => void;
}

export default function UnitOverview({ unit, onEditClick }: UnitOverviewProps) {
  const categoryName = CATEGORIES.find(c => c.id === unit.category)?.name || unit.category;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6 text-right" style={{ direction: "rtl" }}>
      {unit.status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-2xl text-xs font-semibold leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start md:items-center gap-3">
            <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5 md:mt-0" />
            <p>کارگاه شما در انتظار تایید مدیر می‌باشد. پس از بررسی، کارگاه و محصولات شما در سایت به نمایش در خواهند آمد.</p>
          </div>
          <span className="bg-amber-100/80 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-bold shrink-0 self-start md:self-auto flex items-center justify-center">در انتظار تایید</span>
        </div>
      )}
      
      {unit.status === 'approved' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-2xl text-xs font-semibold leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start md:items-center gap-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5 md:mt-0" />
            <p>کارگاه شما توسط مدیر تایید شده است و اکنون به همراه محصولات در سایت قابل مشاهده می‌باشد.</p>
          </div>
          <span className="bg-emerald-100/80 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-bold shrink-0 self-start md:self-auto flex items-center justify-center">تایید شده</span>
        </div>
      )}

      {unit.status === 'rejected' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-950 p-4 rounded-2xl text-xs font-semibold leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start md:items-center gap-3">
            <XCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5 md:mt-0" />
            <p>متاسفانه کارگاه شما مورد تایید قرار نگرفت. لطفاً اطلاعات را ویرایش کرده یا با پشتیبانی تماس بگیرید.</p>
          </div>
          <span className="bg-rose-100/80 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg font-bold shrink-0 self-start md:self-auto flex items-center justify-center">رد شده</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-start md:items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
            {unit.profileImage ? (
              <img src={unit.profileImage} alt={unit.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Building2 className="h-10 w-10 text-indigo-500" />
            )}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-800">{unit.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {categoryName}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                ثبت شده در سامانه شهرک صنعتی
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onEditClick}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>ویرایش اطلاعات کارگاه</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contacts info Card */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5">
          <h3 className="text-xs font-black text-indigo-950 flex items-center gap-2">
            <Phone className="h-4 w-4 text-indigo-600" />
            <span>اطلاعات تماس کارگاه</span>
          </h3>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-500">تلفن ثابت:</span>
              <a href={`tel:${unit.phone}`} className="font-mono font-bold hover:text-indigo-600 underline">
                {unit.phone}
              </a>
            </div>

            {unit.mobile1 && (
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Smartphone className="h-3 w-3 text-slate-400" />
                  <span>موبایل ۱:</span>
                </span>
                <a href={`tel:${unit.mobile1}`} className="font-mono font-bold hover:text-indigo-600 underline">
                  {unit.mobile1}
                </a>
              </div>
            )}

            {unit.mobile2 && (
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Smartphone className="h-3 w-3 text-slate-400" />
                  <span>موبایل ۲:</span>
                </span>
                <a href={`tel:${unit.mobile2}`} className="font-mono font-bold hover:text-indigo-600 underline">
                  {unit.mobile2}
                </a>
              </div>
            )}

            {unit.email && (
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span>ایمیل:</span>
                </span>
                <a href={`mailto:${unit.email}`} className="font-mono font-bold hover:text-indigo-600 underline truncate max-w-[150px]" style={{ direction: "rtl" }}>
                  {unit.email}
                </a>
              </div>
            )}

            {unit.website && (
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-slate-400" />
                  <span>وب‌سایت:</span>
                </span>
                <a 
                  href={unit.website.startsWith("http") ? unit.website : `https://${unit.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-mono font-bold hover:text-indigo-600 underline truncate max-w-[150px]" 
                  style={{ direction: "rtl" }}
                >
                  {unit.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Location / Geoposition Card */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5">
          <h3 className="text-xs font-black text-indigo-950 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-600" />
            <span>آدرس و اطلاعات مکانی</span>
          </h3>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-400 text-[10px]">آدرس ثبت شده:</span>
              <p className="font-bold text-slate-700 leading-relaxed">{unit.address}</p>
            </div>

            {(unit.latitude || unit.mapUrl) && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {unit.latitude && unit.longitude && (
                  <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">
                    GPS: {unit.latitude.toFixed(4)}, {unit.longitude.toFixed(4)}
                  </span>
                )}
                {unit.mapUrl && (
                  <a
                    href={unit.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold hover:shadow-sm transition-all"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>مسیریابی روی نقشه</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description / Summary */}
      {unit.description && (
        <div className="space-y-2">
          <h3 className="text-xs font-black text-slate-800">توضیحات و حوزه فعالیت کارگاه:</h3>
          <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {unit.description}
          </p>
        </div>
      )}

      {/* SEO details */}
      {(unit.seoKeywords || unit.seoDescription) && (
        <div className="p-4 bg-indigo-50/20 border border-indigo-100/40 rounded-2xl space-y-3">
          <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            <span>بهینه‌سازی سئو موتورهای جستجو (گوگل)</span>
          </h4>
          <div className="space-y-2 text-[11px] text-slate-500">
            {unit.seoKeywords && (
              <p className="leading-relaxed">
                <span className="font-bold text-slate-600">کلمات کلیدی ثبت شده:</span>{" "}
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100">{unit.seoKeywords}</span>
              </p>
            )}
            {unit.seoDescription && (
              <p className="leading-relaxed">
                <span className="font-bold text-slate-600">توضیحات متا گوگل:</span>{" "}
                <span className="font-medium text-slate-500 bg-white p-2 rounded-xl border border-slate-100 block mt-1">{unit.seoDescription}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
