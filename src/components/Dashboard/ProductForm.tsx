import React, { useState, useRef } from "react";
import { X, Check, Loader2, Image as ImageIcon, Search } from "lucide-react";
import { Product } from "../../types";
import { saveProduct } from "../../lib/firebaseUtils";
import { compressImage } from "../../lib/imageCompression";
import toast from "react-hot-toast";

interface ProductFormProps {
  editingProduct: Product | null;
  unitId: string;
  ownerId: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function ProductForm({
  editingProduct,
  unitId,
  ownerId,
  onSave,
  onCancel,
}: ProductFormProps) {
  const [prodName, setProdName] = useState(editingProduct?.name || "");
  const [prodDescription, setProdDescription] = useState(editingProduct?.description || "");
  const [prodImage, setProdImage] = useState(editingProduct?.image || "");
  const [prodPrice, setProdPrice] = useState(editingProduct?.price || "");
  const [prodSeoKeywords, setProdSeoKeywords] = useState(editingProduct?.seoKeywords || "");
  const [prodSeoDescription, setProdSeoDescription] = useState(editingProduct?.seoDescription || "");

  const [savingProduct, setSavingProduct] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const prodImgInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setProductImageUploading(true);

    const MAX_SIZE = 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE) {
      setUploadError("حجم فایل انتخاب شده بیش از حد مجاز (۱ مگابایت) است.");
      toast.error("حجم تصویر محصول نباید بیشتر از ۱ مگابایت باشد.");
      setProductImageUploading(false);
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
            setProdImage(data.url);
          } else {
            throw new Error(data.error || "آپلود ناموفق بود");
          }
        } catch (innerErr: any) {
          console.error(innerErr);
          setUploadError("خطا در ذخیره‌سازی تصویر در سرور.");
        } finally {
          setProductImageUploading(false);
        }
      };
    } catch (err) {
      console.error(err);
      setUploadError("خطا در پردازش و خواندن فایل تصویر.");
      setProductImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      toast.error("لطفاً نام محصول را وارد کنید.");
      return;
    }
    if (!prodImage) {
      toast.error("لطفاً تصویر محصول را آپلود کنید.");
      return;
    }

    setSavingProduct(true);
    const prodId = editingProduct?.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const productData: Product = {
      id: prodId,
      unitId,
      ownerId,
      name: prodName.trim(),
      description: prodDescription.trim(),
      image: prodImage,
      price: prodPrice.trim() || undefined,
      seoKeywords: prodSeoKeywords.trim() || undefined,
      seoDescription: prodSeoDescription.trim() || undefined,
      createdAt: editingProduct?.createdAt || new Date().toISOString()
    };

    try {
      await saveProduct(productData);
      onSave();
    } catch (err) {
      console.error(err);
      toast.error("خطا در ذخیره اطلاعات محصول.");
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 overflow-hidden text-right" style={{ direction: "rtl" }}>
      <div className="flex justify-between items-center border-b border-slate-50 pb-4">
        <h4 className="font-extrabold text-sm text-slate-800">
          {editingProduct ? "ویرایش مشخصات محصول" : "ثبت و بارگذاری محصول جدید"}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {uploadError && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold">
            {uploadError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">نام محصول تولیدی <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              placeholder="مانند: سبد صنعتی ۲۰ کیلویی"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">حدود قیمت یا رنج قیمت (اختیاری)</label>
            <input
              type="text"
              placeholder="مانند: توافقی / ۵,۰۰۰ تومان"
              value={prodPrice}
              onChange={(e) => setProdPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
            />
          </div>
        </div>

        {/* Product Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">توضیحات، ابعاد یا مشخصات فنی محصول</label>
          <textarea
            rows={3}
            placeholder="مشخصاتی مانند جنس، ابعاد، حداقل تعداد سفارش یا کاربرد کالا را بنویسید..."
            value={prodDescription}
            onChange={(e) => setProdDescription(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none font-medium leading-relaxed"
          />
        </div>

        {/* Product Image Uploader */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">تصویر واضح از محصول <span className="text-rose-500">*</span></label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-28 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {prodImage ? (
                <img src={prodImage} alt="Product Preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <input
              type="file"
              ref={prodImgInputRef}
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => prodImgInputRef.current?.click()}
                disabled={productImageUploading}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {productImageUploading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>در حال بارگذاری تصویر...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>انتخاب و بارگذاری تصویر محصول</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed block">
                ابعاد پیشنهادی: مربع (۱:۱) یا ۴:۳ (مانند ۸۰۰×۸۰۰ پیکسل) • حداکثر حجم مجاز: ۱ مگابایت
              </p>
            </div>
          </div>
        </div>

        {/* Product SEO Settings */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <h3 className="text-xs font-black text-indigo-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Search className="h-4 w-4" />
            <span>تنظیمات سئو محصول (بهینه‌سازی برای گوگل)</span>
          </h3>

          <div className="space-y-4">
            {/* Keywords */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">کلمات کلیدی سئو (با ویرگول جدا کنید)</label>
              <input
                type="text"
                placeholder="مانند: خرید سبد صنعتی، سبد پلاستیکی البرز، سبد میوه ۲۰ کیلویی"
                value={prodSeoKeywords}
                onChange={(e) => setProdSeoKeywords(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">توضیحات متا (نمایش در نتایج جستجوی گوگل)</label>
              <textarea
                rows={2}
                placeholder="توضیح کوتاه و جذابی که در نتایج گوگل زیر لینک محصول شما نمایش داده می‌شود..."
                value={prodSeoDescription}
                onChange={(e) => setProdSeoDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all resize-none font-medium leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Product Form Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
          <button
            type="submit"
            disabled={savingProduct}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-50 hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            {savingProduct ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>در حال ثبت...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>ذخیره کالا</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  );
}
