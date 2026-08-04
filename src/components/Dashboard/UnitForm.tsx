import React, { useState, useRef } from "react";
import { 
  Factory, 
  Save, 
  Loader2, 
  Image as ImageIcon, 
  Phone, 
  Smartphone, 
  MapPin, 
  Locate, 
  Navigation, 
  Search,
  Mail,
  Globe
} from "lucide-react";
import { motion } from "motion/react";
import { Unit, CATEGORIES, UserProfile } from "../../types";
import { CustomUser } from "../../lib/customAuth";
import { saveUnit } from "../../lib/firebaseUtils";
import { compressImage } from "../../lib/imageCompression";
import toast from "react-hot-toast";

interface UnitFormProps {
  unit: Unit | null;
  user: CustomUser;
  profile: UserProfile | null;
  onSave: (savedUnit: Unit) => void;
  onCancel?: () => void;
}

export default function UnitForm({
  unit,
  user,
  profile,
  onSave,
  onCancel,
}: UnitFormProps) {
  const [unitName, setUnitName] = useState(unit?.name || "");
  const [unitCategory, setUnitCategory] = useState(unit?.category || CATEGORIES[0].id);
  const [unitPhone, setUnitPhone] = useState(unit?.phone || "");
  const [unitMobile1, setUnitMobile1] = useState(unit?.mobile1 || profile?.phone || "");
  const [unitMobile2, setUnitMobile2] = useState(unit?.mobile2 || "");
  const [unitEmail, setUnitEmail] = useState(unit?.email || "");
  const [unitWebsite, setUnitWebsite] = useState(unit?.website || "");
  const [unitAddress, setUnitAddress] = useState(unit?.address || "");
  const [unitDescription, setUnitDescription] = useState(unit?.description || "");
  const [unitProfileImage, setUnitProfileImage] = useState(unit?.profileImage || "");
  const [unitLatitude, setUnitLatitude] = useState(unit?.latitude ? String(unit.latitude) : "");
  const [unitLongitude, setUnitLongitude] = useState(unit?.longitude ? String(unit.longitude) : "");
  const [unitMapUrl, setUnitMapUrl] = useState(unit?.mapUrl || "");
  const [unitSeoKeywords, setUnitSeoKeywords] = useState(unit?.seoKeywords || "");
  const [unitSeoDescription, setUnitSeoDescription] = useState(unit?.seoDescription || "");

  const [savingUnit, setSavingUnit] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setLogoUploading(true);

    const MAX_SIZE = 200 * 1024; // 200 KB
    if (file.size > MAX_SIZE) {
      setUploadError("حجم فایل انتخاب شده بیش از حد مجاز (۲۰۰ کیلوبایت) است.");
      toast.error("حجم تصویر لوگو/پروفایل نباید بیشتر از ۲۰۰ کیلوبایت باشد.");
      setLogoUploading(false);
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
            setUnitProfileImage(data.url);
          } else {
            throw new Error(data.error || "آپلود ناموفق بود");
          }
        } catch (innerErr: any) {
          console.error(innerErr);
          setUploadError("خطا در ذخیره‌سازی تصویر در سرور.");
        } finally {
          setLogoUploading(false);
        }
      };
    } catch (err) {
      console.error(err);
      setUploadError("خطا در پردازش و خواندن فایل تصویر.");
      setLogoUploading(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUnitLatitude(String(position.coords.latitude));
          setUnitLongitude(String(position.coords.longitude));
          toast.success("موقعیت جغرافیایی شما با موفقیت دریافت شد!");
        },
        (error) => {
          console.error(error);
          toast.error("خطا در دریافت موقعیت مکانی. لطفا دسترسی به GPS را در مرورگر خود تایید کنید.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("مرورگر شما از دریافت موقعیت مکانی پشتیبانی نمی‌کند.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitPhone.trim() || !unitAddress.trim() || !unitCategory) {
      toast.error("لطفاً تمامی فیلدهای ستاره‌دار را تکمیل کنید.");
      return;
    }

    setSavingUnit(true);
    const unitId = unit?.id || `unit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newUnit: Unit = {
      id: unitId,
      ownerId: unit?.ownerId || user.uid,
      name: unitName.trim(),
      category: unitCategory,
      phone: unitPhone.trim(),
      mobile1: unitMobile1.trim() || undefined,
      mobile2: unitMobile2.trim() || undefined,
      address: unitAddress.trim(),
      description: unitDescription.trim(),
      profileImage: unitProfileImage,
      latitude: unitLatitude.trim() ? parseFloat(unitLatitude) : undefined,
      longitude: unitLongitude.trim() ? parseFloat(unitLongitude) : undefined,
      mapUrl: unitMapUrl.trim() || undefined,
      seoKeywords: unitSeoKeywords.trim() || undefined,
      seoDescription: unitSeoDescription.trim() || undefined,
      email: unitEmail.trim() || undefined,
      website: unitWebsite.trim() || undefined,
      createdAt: unit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveUnit(newUnit);
      onSave(newUnit);
    } catch (err) {
      console.error(err);
      toast.error("خطا در ذخیره اطلاعات کارگاه.");
    } finally {
      setSavingUnit(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6 text-right"
      style={{ direction: "rtl" }}
    >
      <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
          <Factory className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">
            {!unit ? "ثبت کارگاه و واحد تولیدی جدید" : "ویرایش اطلاعات واحد تولیدی"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            اطلاعات کارگاه تولیدی خود را جهت نمایش در بانک اطلاعاتی آنلاین شهرک وارد کنید
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {uploadError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold">
            {uploadError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Unit Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-600">نام کارگاه / واحد تولیدی <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              placeholder="مانند: پلاستیک‌سازی البرز"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-600">حوزه و گروه فعالیت <span className="text-rose-500">*</span></label>
            <select
              required
              value={unitCategory}
              onChange={(e) => setUnitCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer font-semibold"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-600">تلفن کارگاه (تماس مشتریان) <span className="text-rose-500">*</span></label>
            <input
              type="tel"
              required
              placeholder="مانند: 02144556677"
              value={unitPhone}
              onChange={(e) => setUnitPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-left font-semibold"
            />
          </div>

          {/* Profile Image / Logo */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-600">لوگو یا تصویر پروفایل کارگاه</label>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {unitProfileImage ? (
                  <img src={unitProfileImage} alt="Logo Preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {logoUploading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>در حال آپلود لوگو...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>انتخاب و بارگذاری تصویر</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed block">
                  ابعاد مناسب: مربع (۱:۱ مانند ۵۱۲×۵۱۲ پیکسل) • حداکثر حجم مجاز: ۲۰۰ کیلوبایت
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
          <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Phone className="h-4 w-4" />
            <span>اطلاعات تماس کارگاه (تلفن ثابت و ۲ شماره موبایل)</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Landline */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <span>تلفن ثابت کارگاه</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="مانند: 02144556677"
                value={unitPhone}
                onChange={(e) => setUnitPhone(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left font-semibold"
              />
            </div>

            {/* Mobile 1 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-slate-400" />
                <span>شماره موبایل ۱</span>
              </label>
              <input
                type="tel"
                placeholder="مانند: 09121112233"
                value={unitMobile1}
                onChange={(e) => setUnitMobile1(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left font-semibold"
              />
            </div>

            {/* Mobile 2 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-slate-400" />
                <span>شماره موبایل ۲</span>
              </label>
              <input
                type="tel"
                placeholder="مانند: 09354445566"
                value={unitMobile2}
                onChange={(e) => setUnitMobile2(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-slate-400" />
                <span>آدرس ایمیل کارگاه</span>
              </label>
              <input
                type="email"
                placeholder="info@yourcompany.com :مانند"
                value={unitEmail}
                onChange={(e) => setUnitEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left font-semibold"
              />
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-slate-400" />
                <span>آدرس وب‌سایت کارگاه</span>
              </label>
              <input
                type="url"
                placeholder="https://yourcompany.com :مانند"
                value={unitWebsite}
                onChange={(e) => setUnitWebsite(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
          <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <MapPin className="h-4 w-4" />
            <span>مکان و لوکیشن کارگاه</span>
          </h3>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <span>آدرس دقیق کارگاه در شهرک صنعتی</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مانند: خیابان تلاش، کوچه مبتکران ۲، پلاک ۴"
              value={unitAddress}
              onChange={(e) => setUnitAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Coordinates and GPS */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            {/* Latitude */}
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">عرض جغرافیایی (Latitude)</label>
              <input
                type="number"
                step="any"
                placeholder="مانند: 35.6892"
                value={unitLatitude}
                onChange={(e) => setUnitLatitude(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left"
              />
            </div>

            {/* Longitude */}
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">طول جغرافیایی (Longitude)</label>
              <input
                type="number"
                step="any"
                placeholder="مانند: 51.3890"
                value={unitLongitude}
                onChange={(e) => setUnitLongitude(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left"
              />
            </div>

            {/* GPS trigger button */}
            <div className="sm:col-span-4">
              <button
                type="button"
                onClick={handleGetLocation}
                className="w-full px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer h-[38px]"
              >
                <Locate className="h-4 w-4" />
                <span>موقعیت من با GPS</span>
              </button>
            </div>
          </div>

          {/* Map Url */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Navigation className="h-3 w-3 text-indigo-500" />
              <span>لینک مستقیم نقشه (نشان، بلد یا گوگل مپ)</span>
            </label>
            <input
              type="url"
              placeholder="مانند: https://nshn.ir/... یا https://balad.ir/... یا https://goo.gl/maps/..."
              value={unitMapUrl}
              onChange={(e) => setUnitMapUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono text-left"
            />
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              می‌توانید لینک اشتراک‌گذاری لوکیشن از برنامه‌های نقشه و مسیریاب را برای هدایت راحت‌تر مشتریان کپی کرده و در این قسمت قرار دهید.
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-slate-600">توضیح کامل فعالیت، نوع تولیدات یا دستگاه‌ها</label>
          <textarea
            rows={4}
            placeholder="جزئیاتی از محصولات، مواد اولیه، تیراژ تولید یا امکان همکاری بنویسید..."
            value={unitDescription}
            onChange={(e) => setUnitDescription(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none font-medium leading-relaxed"
          />
        </div>

        {/* SEO Section */}
        <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 space-y-4">
          <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 pb-2 border-b border-indigo-100/50">
            <Search className="h-4 w-4" />
            <span>تنظیمات سئو (SEO) - دیده‌شدن در موتورهای جستجو</span>
          </h3>

          {/* Keywords */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">کلمات کلیدی (با کاما جدا کنید)</label>
            <input
              type="text"
              placeholder="مانند: تولیدی کفش، کفش چرم تبریز، عمده فروشی کفش"
              value={unitSeoKeywords}
              onChange={(e) => setUnitSeoKeywords(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">توضیحات متا (نمایش در نتایج جستجو)</label>
            <textarea
              rows={2}
              placeholder="توضیح کوتاه و جذابی که در نتایج گوگل زیر لینک صفحه شما نمایش داده می‌شود..."
              value={unitSeoDescription}
              onChange={(e) => setUnitSeoDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all resize-none font-medium leading-relaxed"
            />
          </div>
        </div>

        {/* Form actions */}
        <div className="flex items-center gap-3 border-t border-slate-50 pt-5 mt-8">
          <button
            type="submit"
            disabled={savingUnit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md shadow-indigo-50 hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            {savingUnit ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>در حال ذخیره‌سازی...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>ذخیره مشخصات کارگاه</span>
              </>
            )}
          </button>

          {unit && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              انصراف
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
}
