import React, { useEffect, useState } from "react";
import { Unit, Product, CATEGORIES } from "../types";
import { CheckCircle2 } from "lucide-react";
import { getProductsByUnit, getAllProducts, getAllUnits } from "../lib/firebaseUtils";
import { X, Phone, MapPin, Tag, Package, Mail, Calendar, Loader2, Smartphone, Navigation, MessageSquare, Share2, Copy, Check, Layers, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProductGridSkeleton } from "./Skeleton";
import toast from "react-hot-toast";
import { formatPrice } from "../lib/helpers";
import ChatSystem from "./ChatSystem";

interface UnitDetailModalProps {
  unit: Unit | null;
  onClose: () => void;
  onUnitChange?: (unit: Unit) => void;
}

export default function UnitDetailModal({ unit, onClose, onUnitChange }: UnitDetailModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);

  // RFQ (Request for Quote) states
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Quick Share States
  const [copied, setCopied] = useState(false);
  const [productCopied, setProductCopied] = useState(false);

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleCopyLink = () => {
    if (!unit) return;
    const shareUrl = `${window.location.origin}?unit=${unit.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy unit link:", err);
      });
  };

  const handleProductCopyLink = () => {
    if (!unit || !selectedProduct) return;
    const shareUrl = `${window.location.origin}?unit=${unit.id}&product=${selectedProduct.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setProductCopied(true);
        setTimeout(() => setProductCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy product link:", err);
      });
  };

  const handleNativeShare = () => {
    if (!unit) return;
    const shareUrl = `${window.location.origin}?unit=${unit.id}`;
    const shareText = `کارت واحد صنعتی "${unit.name}" در سامانه جامع شهرک‌های صنعتی`;
    if (navigator.share) {
      navigator.share({
        title: unit.name,
        text: shareText,
        url: shareUrl,
      }).catch((err) => console.log("Native share cancelled:", err));
    }
  };

  const handleProductNativeShare = () => {
    if (!unit || !selectedProduct) return;
    const shareUrl = `${window.location.origin}?unit=${unit.id}&product=${selectedProduct.id}`;
    const shareText = `محصول "${selectedProduct.name}" - تولید شده توسط "${unit.name}"`;
    if (navigator.share) {
      navigator.share({
        title: selectedProduct.name,
        text: shareText,
        url: shareUrl,
      }).catch((err) => console.log("Product native share cancelled:", err));
    }
  };

  useEffect(() => {
    getAllProducts()
      .then((data) => setAllProducts(data))
      .catch((err) => console.error("Error loading all products:", err));

    getAllUnits()
      .then((data) => setAllUnits(data))
      .catch((err) => console.error("Error loading all units:", err));
  }, []);

  const handleSelectProductFromOtherWorkshop = (prod: Product, targetUnit: Unit) => {
    const url = new URL(window.location.href);
    url.searchParams.set("unit", targetUnit.id);
    url.searchParams.set("product", prod.id);
    window.history.pushState({}, "", url.toString());

    if (onUnitChange) {
      onUnitChange(targetUnit);
    }
    setSelectedProduct(prod);
  };

  useEffect(() => {
    setShowQuoteForm(false);
    setBuyerName("");
    setBuyerPhone("");
    setQuantity("");
    setQuoteDesc("");
    setQuoteSuccess(false);
  }, [selectedProduct]);

  useEffect(() => {
    if (unit) {
      setLoading(true);
      getProductsByUnit(unit.id)
        .then((data) => {
          setProducts(data);
          // Auto-select product from URL params if present
          const params = new URLSearchParams(window.location.search);
          const productIdParam = params.get("product") || params.get("productId");
          if (productIdParam) {
            const foundProduct = data.find(p => p.id === productIdParam);
            if (foundProduct) {
              setSelectedProduct(foundProduct);
            }
          }
        })
        .catch((err) => {
          console.error("Error loading products:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [unit]);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerPhone.trim() || !quantity.trim()) {
      toast.error("لطفاً تمامی فیلدهای ستاره‌دار را تکمیل کنید.");
      return;
    }
    if (!selectedProduct) return;

    setSendingQuote(true);
    try {
      const payload = {
        productId: selectedProduct.id,
        unitId: unit.id,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        quantity: quantity.trim(),
        description: quoteDesc.trim()
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setQuoteSuccess(true);
        toast.success("استعلام قیمت شما با موفقیت ارسال شد.");
        setBuyerName("");
        setBuyerPhone("");
        setQuantity("");
        setQuoteDesc("");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "خطا در ارسال استعلام.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور.");
    } finally {
      setSendingQuote(false);
    }
  };

  useEffect(() => {
    if (unit) {
      // Update SEO Meta Tags
      const originalTitle = document.title;
      let metaDescription = document.querySelector('meta[name="description"]');
      let metaKeywords = document.querySelector('meta[name="keywords"]');

      const originalDescContent = metaDescription?.getAttribute('content') || '';
      const originalKeyContent = metaKeywords?.getAttribute('content') || '';

      if (selectedProduct) {
        document.title = `${selectedProduct.name} | ${unit.name} | سامانه جامع شهرک‌های صنعتی`;
        
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.setAttribute('name', 'description');
          document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', selectedProduct.seoDescription || selectedProduct.description.substring(0, 150));

        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', selectedProduct.seoKeywords || `${selectedProduct.name}, ${unit.name}, ${unit.category}`);
      } else {
        document.title = `${unit.name} | سامانه جامع شهرک‌های صنعتی`;
        
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.setAttribute('name', 'description');
          document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', unit.seoDescription || unit.description.substring(0, 150));

        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', unit.seoKeywords || unit.category);
      }

      return () => {
        // Revert SEO changes on modal close or change
        document.title = originalTitle;
        if (metaDescription) metaDescription.setAttribute('content', originalDescContent);
        if (metaKeywords) metaKeywords.setAttribute('content', originalKeyContent);
      };
    }
  }, [unit, selectedProduct]);

  // Sibling products (same unit/workshop, but not the current product)
  const otherWorkshopProductsRaw = selectedProduct 
    ? products.filter(p => p.id !== selectedProduct.id)
    : [];
  const otherWorkshopProducts = otherWorkshopProductsRaw.filter((p, idx, self) => self.findIndex(t => t.id === p.id) === idx);

  // Sibling units (other workshops with the same category)
  const otherUnitsWithSameCategory = (selectedProduct && unit)
    ? allUnits.filter(u => u.category === unit.category && u.id !== unit.id)
    : [];

  // Sibling products from other workshops
  const similarProductsFromOtherWorkshopsRaw = selectedProduct
    ? allProducts.filter(p => p.id !== selectedProduct.id && otherUnitsWithSameCategory.some(ou => ou.id === p.unitId))
    : [];
  const similarProductsFromOtherWorkshops = similarProductsFromOtherWorkshopsRaw.filter((p, idx, self) => self.findIndex(t => t.id === p.id) === idx);

  if (!unit) return null;

  const categoryObj = CATEGORIES.find((c) => c.id === unit.category);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100"
        >
          {/* Header area */}
          <div className="relative p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
            <div className="flex items-center gap-4">
              {unit.profileImage ? (
                <img
                  src={unit.profileImage}
                  alt={unit.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 font-extrabold text-2xl">
                  {unit.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
                  {unit.name}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-800 mt-1.5 border border-indigo-200">
                  <Tag className="h-3 w-3" />
                  {categoryObj?.name || "صنایع تولیدی"}
                </span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/80 rounded-xl text-slate-400 hover:text-slate-600 transition-colors duration-200 border border-slate-100 bg-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="overflow-y-auto p-6 sm:p-8 space-y-8 flex-1">
            {/* Split Grid: Details vs Contact Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Unit Description */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-slate-800 border-r-4 border-indigo-500 pr-3">
                    توضیحات و حوزه فعالیت
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed text-justify whitespace-pre-line bg-slate-50/40 p-4 rounded-2xl border border-slate-100">
                    {unit.description || "توضیحی برای این واحد تولیدی ثبت نشده است."}
                  </p>
                </div>

                {/* Quick Share Widget */}
                <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/50 space-y-3">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-indigo-600" />
                    <span>اشتراک‌گذاری سریع کارت کارگاه (اشتراک سریع)</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    با اشتراک‌گذاری این واحد تولیدی، همکاران و خریداران را به راحتی از اطلاعات تماس و کاتالوگ محصولات این کارگاه مطلع کنید.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Copy Link Button */}
                    <button
                      onClick={handleCopyLink}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        copied
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "لینک کپی شد!" : "کپی لینک مستقیم"}</span>
                    </button>

                    {/* WhatsApp Share */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `واحد صنعتی "${unit.name}"\nحوزه فعالیت: ${categoryObj?.name || "صنایع تولیدی"}\nتلفن ثابت: ${unit.phone}${unit.mobile1 ? `\nهمراه: ${unit.mobile1}` : ""}\nآدرس: ${unit.address}\n\nمشاهده کامل کاتالوگ محصولات و مشخصات فنی در لینک زیر:\n${window.location.origin}?unit=${unit.id}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-700 transition-all"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.456L0 24zm5.835-4.117c1.661.986 3.292 1.503 5.161 1.504 5.416 0 9.825-4.404 9.828-9.826.002-2.628-1.022-5.099-2.883-6.963C16.12 2.733 13.658 1.706 11.038 1.706 5.623 1.706 1.213 6.111 1.21 11.53c0 1.955.513 3.5 1.488 5.1l-.973 3.555 3.653-.958z" />
                      </svg>
                      <span>واتساپ</span>
                    </a>

                    {/* Telegram Share */}
                    <a
                      href={`https://telegram.me/share/url?url=${encodeURIComponent(
                        `${window.location.origin}?unit=${unit.id}`
                      )}&text=${encodeURIComponent(
                        `واحد صنعتی "${unit.name}"\nحوزه فعالیت: ${categoryObj?.name || "صنایع تولیدی"}\nتلفن ثابت: ${unit.phone}${unit.mobile1 ? `\nهمراه: ${unit.mobile1}` : ""}\nآدرس: ${unit.address}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 text-slate-700 transition-all"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M11.944 0C5.356 0 0 5.356 0 11.944 0 18.533 5.356 23.889 11.944 23.889c6.589 0 11.944-5.356 11.944-11.945C23.889 5.356 18.533 0 11.944 0zm5.831 8.283c-.15 1.572-1.397 8.919-2.028 12.302-.266 1.43-.794 1.91-1.303 1.957-1.107.103-1.947-.732-3.02-1.436-1.679-1.101-2.628-1.786-4.256-2.857-1.881-1.238-.662-1.917.411-3.033.281-.292 5.158-4.73 5.253-5.132.012-.05.023-.238-.088-.337-.11-.099-.272-.066-.39-.039-.166.038-2.81 1.786-7.931 5.253-.75.515-1.428.767-2.035.753-.668-.014-1.954-.378-2.911-.69-1.173-.381-2.106-.582-2.025-1.23.042-.337.505-.683 1.389-1.038 5.416-2.355 9.025-3.91 10.828-4.664 5.148-2.148 6.216-2.52 6.914-2.532.153-.003.495.034.717.214.187.151.239.355.251.507.014.167.026.541.011 1.026z" />
                      </svg>
                      <span>تلگرام</span>
                    </a>

                    {/* Native Share */}
                    {canNativeShare && (
                      <button
                        onClick={handleNativeShare}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>اشتراک‌گذاری سیستمی</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100/60 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-indigo-900 mb-3">
                    اطلاعات تماس و لوکیشن
                  </h4>
                  <div className="space-y-3">
                    {/* Landline */}
                    <a
                      href={`tel:${unit.phone}`}
                      className="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100/20 hover:border-indigo-300 hover:shadow-sm text-slate-700 transition-all duration-200 text-xs"
                    >
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-400">تلفن ثابت کارگاه</span>
                        <span className="font-mono text-xs font-bold">{unit.phone}</span>
                      </div>
                    </a>

                    {/* Mobile 1 */}
                    {unit.mobile1 && (
                      <a
                        href={`tel:${unit.mobile1}`}
                        className="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100/20 hover:border-indigo-300 hover:shadow-sm text-slate-700 transition-all duration-200 text-xs"
                      >
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-slate-400">تلفن همراه ۱</span>
                          <span className="font-mono text-xs font-bold">{unit.mobile1}</span>
                        </div>
                      </a>
                    )}

                    {/* Mobile 2 */}
                    {unit.mobile2 && (
                      <a
                        href={`tel:${unit.mobile2}`}
                        className="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100/20 hover:border-indigo-300 hover:shadow-sm text-slate-700 transition-all duration-200 text-xs"
                      >
                        <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg shrink-0">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] text-slate-400">تلفن همراه ۲</span>
                          <span className="font-mono text-xs font-bold">{unit.mobile2}</span>
                        </div>
                      </a>
                    )}

                    {/* Email */}
                    {unit.email && (
                      <a
                        href={`mailto:${unit.email}`}
                        className="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100/20 hover:border-indigo-300 hover:shadow-sm text-slate-700 transition-all duration-200 text-xs"
                      >
                        <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col text-right truncate">
                          <span className="text-[9px] text-slate-400">آدرس ایمیل</span>
                          <span className="font-mono text-xs font-bold truncate max-w-[180px] text-right" style={{ direction: "rtl" }}>{unit.email}</span>
                        </div>
                      </a>
                    )}

                    {/* Website */}
                    {unit.website && (
                      <a
                        href={unit.website.startsWith("http") ? unit.website : `https://${unit.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100/20 hover:border-indigo-300 hover:shadow-sm text-slate-700 transition-all duration-200 text-xs"
                      >
                        <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg shrink-0">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col text-right truncate">
                          <span className="text-[9px] text-slate-400">وب‌سایت کارگاه</span>
                          <span className="font-mono text-xs font-bold truncate max-w-[180px] text-right" style={{ direction: "rtl" }}>{unit.website}</span>
                        </div>
                      </a>
                    )}

                    {/* Address */}
                    <div className="flex items-start gap-3 p-2 bg-white rounded-xl border border-indigo-100/20 text-slate-700 text-xs">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-400">آدرس دقیق</span>
                        <span className="font-medium leading-relaxed">{unit.address}</span>
                      </div>
                    </div>

                    {/* Map & Geolocation Routing Link */}
                    {(unit.mapUrl || (unit.latitude && unit.longitude)) && (
                      <a
                        href={unit.mapUrl || `https://www.google.com/maps/search/?api=1&query=${unit.latitude},${unit.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-200 text-xs font-bold shadow-md shadow-indigo-100"
                      >
                        <Navigation className="h-4 w-4" />
                        <span>مسیریابی و لوکیشن کارگاه</span>
                      </a>
                    )}

                    {/* Chat Button */}
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="w-full flex items-center justify-center gap-2 p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all duration-200 text-xs font-bold shadow-md shadow-emerald-100 cursor-pointer mt-1"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>گفتگوی آنلاین با کارگاه</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-indigo-100/40 pt-3 flex justify-between">
                  <span>ثبت شده در سامانه</span>
                  <span className="font-mono">
                    {new Date(unit.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
              </div>
            </div>
            
            <ChatSystem 
              unitId={unit.id} 
              unitName={unit.name} 
              isOpen={isChatOpen} 
              onClose={() => setIsChatOpen(false)} 
            />

            {/* Products Catalog section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 border-r-4 border-indigo-500 pr-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                <span>کاتالوگ محصولات تولیدی</span>
              </h3>

              {loading ? (
                <div className="space-y-4">
                  <span className="text-xs text-slate-400 font-semibold block">در حال بارگذاری محصولات...</span>
                  <ProductGridSkeleton count={3} />
                </div>
              ) : products.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                  <p className="text-slate-500 text-sm font-medium mb-1">
                    محصولی برای این کارگاه ثبت نشده است.
                  </p>
                  <p className="text-xs text-slate-400">
                    مدیر کارگاه می‌تواند از پنل مدیریت تصاویر و مشخصات محصولات را اضافه کند.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product, index) => (
                    <div
                      key={`${product.id}-${index}`}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                    >
                      <div className="h-48 bg-slate-50 border-b border-slate-100 relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm mb-1.5 line-clamp-1">
                            {product.name}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {product.description || "توضیحی برای این محصول وجود ندارد."}
                          </p>
                        </div>
                        
                        {product.price && (
                          <div className="border-t border-slate-50 pt-3 mt-3 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">حدود قیمت:</span>
                            <span className="text-xs font-extrabold text-indigo-600">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>

      {/* Product Detail Modal OVERLAY */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col my-8"
            style={{ direction: "rtl" }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="space-y-1">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-800 leading-snug">
                  {selectedProduct.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                    <Package className="h-3 w-3" />
                    {categoryObj?.name || "محصول تولیدی"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                    <MapPin className="h-3 w-3" />
                    کارگاه: {unit.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-all cursor-pointer border border-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Section (Two Columns) */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Right Column (Info, Media & Related) */}
                <div className="space-y-5">
                  {/* Product Image */}
                  <div className="aspect-[4/3] w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-150 flex items-center justify-center relative p-3">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 rounded-full bg-indigo-600" />
                      <span>مشخصات فنی و توضیحات محصول:</span>
                    </h4>
                    <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-justify whitespace-pre-line">
                      {selectedProduct.description || "توضیحی برای این محصول وجود ندارد."}
                    </div>
                  </div>


                  {/* Similar Products in other Workshops */}
                  {similarProductsFromOtherWorkshops.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-100/60">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-indigo-600" />
                        <span>محصولات مشابه در کارگاه‌های دیگر</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {similarProductsFromOtherWorkshops.map((p, index) => {
                          const prodUnit = allUnits.find(u => u.id === p.unitId);
                          return (
                            <button
                              key={`${p.id}-${index}`}
                              onClick={() => {
                                if (prodUnit) {
                                  handleSelectProductFromOtherWorkshop(p, prodUnit);
                                }
                              }}
                              className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-55/10 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200/60 rounded-xl px-3 py-2 transition-all text-right flex flex-wrap items-center gap-1.5 cursor-pointer"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>{p.name}</span>
                              {prodUnit && (
                                <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {prodUnit.name}
                                </span>
                              )}
                              {p.price && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ({formatPrice(p.price)} ریال)
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Column (Pricing, Contact, Request for Quote & Share) */}
                <div className="space-y-5">
                  {/* Price Details */}
                  <div className="flex justify-between items-center bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/30">
                    <span className="text-xs font-extrabold text-indigo-950">حدود قیمت:</span>
                    <span className="text-xs font-black text-indigo-600">
                      {selectedProduct.price ? `${formatPrice(selectedProduct.price)} ریال` : "توافقی (تماس بگیرید)"}
                    </span>
                  </div>

                  {/* Direct Contact Actions */}
                  <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 rounded-full bg-emerald-600" />
                      <span>تماس مستقیم با کارگاه:</span>
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                      جهت سفارش، استعلام قیمت به‌روز و هماهنگی‌های فنی، مستقیماً تماس بگیرید:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <a
                        href={`tel:${unit.phone}`}
                        className="flex items-center justify-center gap-2 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all text-center cursor-pointer"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>تلفن ثابت: {unit.phone}</span>
                      </a>
                      {unit.mobile1 && (
                        <a
                          href={`tel:${unit.mobile1}`}
                          className="flex items-center justify-center gap-2 p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all text-center cursor-pointer"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          <span>تلفن همراه: {unit.mobile1}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Request for Quote Form (RFQ) */}
                  <div className="space-y-3">
                    {!showQuoteForm ? (
                      <button
                        type="button"
                        onClick={() => setShowQuoteForm(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-all text-center cursor-pointer shadow-sm"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>ثبت استعلام سریع قیمت و مشخصات فنی (RFQ)</span>
                      </button>
                    ) : (
                      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200/50">
                          <MessageSquare className="h-4 w-4 text-indigo-600" />
                          <span>فرم استعلام فنی و قیمت کالا</span>
                        </h4>

                        {quoteSuccess ? (
                          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-center text-xs font-bold space-y-2">
                            <p>✓ درخواست استعلام شما با موفقیت ثبت شد.</p>
                            <p className="text-[10px] text-emerald-600 font-medium">مدیر کارگاه در اسرع وقت با شماره تلفن شما تماس خواهد گرفت.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setQuoteSuccess(false);
                                setShowQuoteForm(false);
                              }}
                              className="mt-2 text-[10px] bg-white border border-emerald-200 text-emerald-800 px-3 py-1 rounded-md cursor-pointer"
                            >
                              ثبت استعلام جدید
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleSubmitQuote} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">نام و نام خانوادگی خریدار <span className="text-rose-500">*</span></label>
                                <input
                                  type="text"
                                  required
                                  placeholder="مانند: علی حسینی"
                                  value={buyerName}
                                  onChange={(e) => setBuyerName(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-medium"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">شماره همراه تماس <span className="text-rose-500">*</span></label>
                                <input
                                  type="tel"
                                  required
                                  placeholder="مانند: 09123456789"
                                  value={buyerPhone}
                                  onChange={(e) => setBuyerPhone(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-medium text-right font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">تعداد یا حجم مورد نیاز <span className="text-rose-500">*</span></label>
                                <input
                                  type="text"
                                  required
                                  placeholder="مانند: ۱۰۰۰ عدد، ۵ تن"
                                  value={quantity}
                                  onChange={(e) => setQuantity(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-medium"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">توضیحات درخواستی</label>
                                <input
                                  type="text"
                                  placeholder="ابعاد، رنگ یا آلیاژ درخواستی..."
                                  value={quoteDesc}
                                  onChange={(e) => setQuoteDesc(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-medium"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                type="submit"
                                disabled={sendingQuote}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-50 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {sendingQuote ? "در حال ارسال..." : "ارسال استعلام"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowQuoteForm(false)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                انصراف
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Product Share Options */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Share2 className="h-4 w-4 text-indigo-600" />
                      <span>اشتراک‌گذاری سریع این محصول:</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleProductCopyLink}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          productCopied
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {productCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{productCopied ? "لینک کپی شد!" : "کپی لینک"}</span>
                      </button>

                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                          `محصول "${selectedProduct.name}"\nتولیدکننده: ${unit.name}\nحدود قیمت: ${formatPrice(selectedProduct.price) || "توافقی"}\n\nمشاهده تصاویر کاتالوگ و مشخصات فنی بیشتر در لینک زیر:\n${window.location.origin}?unit=${unit.id}&product=${selectedProduct.id}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-700 transition-all"
                      >
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.456L0 24zm5.835-4.117c1.661.986 3.292 1.503 5.161 1.504 5.416 0 9.825-4.404 9.828-9.826.002-2.628-1.022-5.099-2.883-6.963C16.12 2.733 13.658 1.706 11.038 1.706 5.623 1.706 1.213 6.111 1.21 11.53c0 1.955.513 3.5 1.488 5.1l-.973 3.555 3.653-.958z" />
                        </svg>
                        <span>واتساپ</span>
                      </a>

                      <a
                        href={`https://telegram.me/share/url?url=${encodeURIComponent(
                          `${window.location.origin}?unit=${unit.id}&product=${selectedProduct.id}`
                        )}&text=${encodeURIComponent(
                          `محصول "${selectedProduct.name}"\nتولیدکننده: ${unit.name}\nحدود قیمت: ${formatPrice(selectedProduct.price) || "توافقی"}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 text-slate-700 transition-all"
                      >
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                          <path d="M11.944 0C5.356 0 0 5.356 0 11.944 0 18.533 5.356 23.889 11.944 23.889c6.589 0 11.944-5.356 11.944-11.945C23.889 5.356 18.533 0 11.944 0zm5.831 8.283c-.15 1.572-1.397 8.919-2.028 12.302-.266 1.43-.794 1.91-1.303 1.957-1.107.103-1.947-.732-3.02-1.436-1.679-1.101-2.628-1.786-4.256-2.857-1.881-1.238-.662-1.917.411-3.033.281-.292 5.158-4.73 5.253-5.132.012-.05.023-.238-.088-.337-.11-.099-.272-.066-.39-.039-.166.038-2.81 1.786-7.931 5.253-.75.515-1.428.767-2.035.753-.668-.014-1.954-.378-2.911-.69-1.173-.381-2.106-.582-2.025-1.23.042-.337.505-.683 1.389-1.038 5.416-2.355 9.025-3.91 10.828-4.664 5.148-2.148 6.216-2.52 6.914-2.532.153-.003.495.034.717.214.187.151.239.355.251.507.014.167.026.541.011 1.026z" />
                        </svg>
                        <span>تلگرام</span>
                      </a>

                      {canNativeShare && (
                        <button
                          onClick={handleProductNativeShare}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer"
                        >
                          <Share2 className="h-3 w-3" />
                          <span>اشتراک سیستمی</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sibling Products inside the same Workshop */}
                  {otherWorkshopProducts.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-slate-150">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-indigo-600" />
                        <span>دیگر محصولات این کارگاه ({unit.name})</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {otherWorkshopProducts.map((p, index) => (
                          <button
                            key={`${p.id}-${index}`}
                            onClick={() => {
                              setSelectedProduct(p);
                              const url = new URL(window.location.href);
                              url.searchParams.set("product", p.id);
                              window.history.pushState({}, "", url.toString());
                            }}
                            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-55/10 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200/60 rounded-xl px-3 py-2 transition-all text-right flex items-center gap-2 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>{p.name}</span>
                            {p.price && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({formatPrice(p.price)} ریال)
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SEO Tags preview if exist (subtle) */}
                  {(selectedProduct.seoKeywords || selectedProduct.seoDescription) && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] text-slate-400 space-y-1">
                      <p className="font-bold text-slate-500">کلمات کلیدی سئو محصول:</p>
                      <p>{selectedProduct.seoKeywords || "بدون کلمه کلیدی"}</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Footer bar */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                بستن پنجره جزئیات
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
