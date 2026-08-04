import React, { useState } from "react";
import { Unit, Product, CATEGORIES } from "../types";
import { Search, Grid, HelpCircle, Phone, ArrowLeft, Layers, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { filterProducts, formatPrice } from "../lib/helpers";

interface AllProductsPageProps {
  units: Unit[];
  products: Product[];
  onSelectUnit: (unit: Unit) => void;
}

export default function AllProductsPage({ units, products, onSelectUnit }: AllProductsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productsPage, setProductsPage] = useState(1);

  React.useEffect(() => {
    setProductsPage(1);
  }, [searchQuery, selectedCategory]);

  // Helper to find the unit for a given product
  const getProductUnit = (product: Product): Unit | undefined => {
    return units.find((u) => u.id === product.unitId);
  };

  // Filter products based on search query and category of their unit
  const filteredProducts = filterProducts(products, units, selectedCategory, searchQuery);

  return (
    <div className="space-y-8" style={{ direction: "rtl" }}>
      {/* Page Header */}
      <div className="text-right space-y-2">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[11px] font-black">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ویترین سراسری محصولات شهرک صنعتی</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          کاتالوگ کامل محصولات و تولیدات دایرکتوری
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-3xl">
          در این بخش، تمامی محصولات و تولیداتی که توسط مدیران واحدهای مختلف صنعتی شهرک ثبت شده‌اند به صورت یکجا قابل مشاهده، جستجو و فیلتر هستند. با کلیک بر روی هر محصول می‌توانید مشخصات کامل کارگاه و راه‌های تماس با تولیدکننده را مشاهده فرمایید.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm gap-4 flex flex-col md:flex-row items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام محصول، توضیحات، کلمات کلیدی یا نام کارگاه..."
            className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-72 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">رسته صنعتی:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="">همه رسته‌های صنعتی</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Products */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center max-w-md mx-auto shadow-sm">
          <Layers className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-3" />
          <h4 className="font-extrabold text-slate-700 text-sm mb-1">محصولی یافت نشد</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            هیچ محصولی با معیارهای جستجوی شما مطابقت ندارد. از کلمات کلیدی ساده‌تر یا رسته‌های دیگر استفاده نمایید.
          </p>
          {(searchQuery || selectedCategory) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
              }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              حذف فیلترها و نمایش همه
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.slice((productsPage - 1) * 8, productsPage * 8).map((product, index) => {
              const parentUnit = getProductUnit(product);
              const categoryObj = parentUnit
                ? CATEGORIES.find((c) => c.id === parentUnit.category)
                : null;

              return (
                <motion.div
                  key={`${product.id}-${index}`}
                  whileHover={{ y: -4, scale: 1.01 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.4) }}
                  className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="relative h-44 w-full bg-slate-50 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <Grid className="h-10 w-10 stroke-1 group-hover:scale-110 transition-transform duration-300 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 mt-2">تصویر کالا</span>
                      </div>
                    )}

                    {/* Price Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-900/90 text-white shadow-sm backdrop-blur-sm">
                        {product.price ? `${formatPrice(product.price)} ریال` : "تماس بگیرید"}
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200">
                        {product.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                        {product.description || "بدون توضیحات تکمیلی کالا."}
                      </p>
                    </div>

                    {/* Parent Industrial Unit Info Row */}
                    {parentUnit && (
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-slate-400">تولیدکننده:</span>
                          <span className="text-xs font-black text-slate-700 truncate max-w-[130px]" title={parentUnit.name}>
                            {parentUnit.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 font-bold">
                          <span>رسته:</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {categoryObj?.name || "صنایع تولیدی"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Button to View Unit Details */}
                  {parentUnit ? (
                    <button
                      onClick={() => onSelectUnit(parentUnit)}
                      className="w-full px-5 py-3 bg-indigo-50/20 group-hover:bg-indigo-600 hover:!bg-indigo-700 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 group-hover:text-white font-extrabold transition-all duration-300 cursor-pointer"
                    >
                      <span>جزئیات و راه‌های تماس با کارگاه</span>
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                    </button>
                  ) : (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold">
                      اطلاعات کارگاه در دسترس نیست
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          {Math.ceil(filteredProducts.length / 8) > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6" style={{ direction: "rtl" }}>
              <button
                onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                disabled={productsPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1"
              >
                <span>قبلی</span>
              </button>
              
              {Array.from({ length: Math.ceil(filteredProducts.length / 8) }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setProductsPage(pageNum)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    productsPage === pageNum
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setProductsPage(p => Math.min(Math.ceil(filteredProducts.length / 8), p + 1))}
                disabled={productsPage === Math.ceil(filteredProducts.length / 8)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1"
              >
                <span>بعدی</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
