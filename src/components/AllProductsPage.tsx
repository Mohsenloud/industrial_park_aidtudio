import React, { useState, useMemo, useEffect } from "react";
import { Unit, Product, CATEGORIES } from "../types";
import {
  Search,
  Grid,
  HelpCircle,
  Phone,
  ArrowLeft,
  Layers,
  Sparkles,
  SlidersHorizontal,
  X,
  Tag,
  ArrowUpDown,
  Coins,
  CheckCircle2,
  Filter,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { filterProducts, formatPrice, parseNumericPrice } from "../lib/helpers";

interface AllProductsPageProps {
  units: Unit[];
  products: Product[];
  onSelectUnit: (unit: Unit) => void;
}

export default function AllProductsPage({ units, products, onSelectUnit }: AllProductsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [onlyWithPrice, setOnlyWithPrice] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "name">("newest");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [productsPage, setProductsPage] = useState(1);

  // Parse numerical min & max prices in real time
  const minPriceNum = useMemo(() => parseNumericPrice(minPriceInput), [minPriceInput]);
  const maxPriceNum = useMemo(() => parseNumericPrice(maxPriceInput), [maxPriceInput]);

  // Reset page when any filter criteria changes
  useEffect(() => {
    setProductsPage(1);
  }, [searchQuery, selectedCategory, minPriceNum, maxPriceNum, onlyWithPrice, sortBy]);

  // Helper to find the unit for a given product
  const getProductUnit = (product: Product): Unit | undefined => {
    return units.find((u) => u.id === product.unitId);
  };

  // Real-time filtered products
  const filteredProducts = useMemo(() => {
    return filterProducts(
      products,
      units,
      selectedCategory,
      searchQuery,
      minPriceNum,
      maxPriceNum,
      onlyWithPrice,
      sortBy
    );
  }, [products, units, selectedCategory, searchQuery, minPriceNum, maxPriceNum, onlyWithPrice, sortBy]);

  // Quick price presets (in Rials)
  const PRICE_PRESETS = [
    { label: "همه قیمت‌ها", min: null, max: null },
    { label: "زیر ۵ میلیون ریال", min: null, max: 5000000 },
    { label: "۵ تا ۲۰ میلیون ریال", min: 5000000, max: 20000000 },
    { label: "۲۰ تا ۱۰۰ میلیون ریال", min: 20000000, max: 100000000 },
    { label: "بالای ۱۰۰ میلیون ریال", min: 100000000, max: null },
  ];

  // Helper to format typed input numbers with thousands separators
  const handlePriceInputChange = (val: string, setter: (v: string) => void) => {
    const rawDigits = val.replace(/[^\d\u0660-\u0669\u06f0-\u06f9]/g, "");
    if (!rawDigits) {
      setter("");
      return;
    }
    const num = parseNumericPrice(rawDigits);
    if (num !== null) {
      setter(formatPrice(num));
    } else {
      setter(val);
    }
  };

  const handleApplyPricePreset = (min: number | null, max: number | null) => {
    setMinPriceInput(min !== null ? formatPrice(min) : "");
    setMaxPriceInput(max !== null ? formatPrice(max) : "");
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setOnlyWithPrice(false);
    setSortBy("newest");
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCategory ||
    minPriceInput.trim() ||
    maxPriceInput.trim() ||
    onlyWithPrice ||
    sortBy !== "newest"
  );

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const parentUnit = units.find((u) => u.id === p.unitId);
      if (parentUnit && parentUnit.category) {
        counts[parentUnit.category] = (counts[parentUnit.category] || 0) + 1;
      }
    });
    return counts;
  }, [products, units]);

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      {/* Page Header Banner */}
      <div className="bg-gradient-to-l from-indigo-900 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden border border-indigo-800/30">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            <span>ویترین سراسری کالاها و تولیدات شهرک صنعتی</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
            کاتالوگ و جستجوی لحظه‌ای محصولات
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            جستجو، پالایش و فیلتر هم‌زمان بر اساس نام کالا، رسته صنعتی، محدوده قیمت (ریال) و تولیدکننده در یک نگاه.
          </p>
        </div>
        <Grid className="h-44 w-44 text-white/5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-1" />
      </div>

      {/* Main Search & Control Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          
          {/* Real-Time Search Input */}
          <div className="relative w-full lg:flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی لحظه‌ای نام محصول، توضیحات، کلمات کلیدی یا نام کارگاه..."
              className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="پاک کردن جستجو"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full sm:w-64 flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="">همه رسته‌های صنعتی ({products.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({categoryCounts[cat.id] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full sm:w-56 flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="newest">جدیدترین محصولات</option>
              <option value="price_asc">ارزان‌ترین قیمت</option>
              <option value="price_desc">گران‌ترین قیمت</option>
              <option value="name">نام کالا (الفبا)</option>
            </select>
          </div>

          {/* Toggle Price Filter Panel Button */}
          <button
            onClick={() => setShowFiltersPanel(prev => !prev)}
            className={`w-full sm:w-auto px-4 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              showFiltersPanel || minPriceInput || maxPriceInput || onlyWithPrice
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 border-slate-200"
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>فیلتر قیمت</span>
            {(minPriceInput || maxPriceInput || onlyWithPrice) && (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>
        </div>

        {/* Expandable Price Range Filter Section */}
        <AnimatePresence>
          {(showFiltersPanel || minPriceInput || maxPriceInput || onlyWithPrice) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-3 border-t border-slate-100 space-y-4 overflow-hidden"
            >
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-indigo-600" />
                    <span>تعیین بازه قیمت کالا (ریال) به صورت لحظه‌ای:</span>
                  </span>
                  
                  {/* Checkbox: Only with price */}
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyWithPrice}
                      onChange={(e) => setOnlyWithPrice(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>فقط کالاهای دارای قیمت مشخص (حذف استعلامی/توافقی)</span>
                  </label>
                </div>

                {/* Price Range Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Min Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      حداقل قیمت (از):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={minPriceInput}
                        onChange={(e) => handlePriceInputChange(e.target.value, setMinPriceInput)}
                        placeholder="مثلاً ۱,۰۰۰,۰۰۰"
                        className="w-full pl-12 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        ریال
                      </span>
                    </div>
                    {minPriceNum !== null && minPriceNum > 0 && (
                      <div className="text-[10px] font-bold text-indigo-600 mt-1">
                        معادل {formatPrice(Math.round(minPriceNum / 10))} تومان
                      </div>
                    )}
                  </div>

                  {/* Max Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      حداکثر قیمت (تا):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={maxPriceInput}
                        onChange={(e) => handlePriceInputChange(e.target.value, setMaxPriceInput)}
                        placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
                        className="w-full pl-12 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        ریال
                      </span>
                    </div>
                    {maxPriceNum !== null && maxPriceNum > 0 && (
                      <div className="text-[10px] font-bold text-indigo-600 mt-1">
                        معادل {formatPrice(Math.round(maxPriceNum / 10))} تومان
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Price Presets */}
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 ml-1">پیش‌فرض‌های سریع:</span>
                  {PRICE_PRESETS.map((preset, idx) => {
                    const isSelected =
                      (preset.min === null ? !minPriceInput : minPriceNum === preset.min) &&
                      (preset.max === null ? !maxPriceInput : maxPriceNum === preset.max);

                    return (
                      <button
                        key={`preset-${preset.label}-${idx}`}
                        onClick={() => handleApplyPricePreset(preset.min, preset.max)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Category Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              selectedCategory === ""
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            همه ({products.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isSelected ? "" : cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-extrabold"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80"
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSelected ? "bg-indigo-800 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Filter Tags Summary */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-700">
              نمایش <span className="text-indigo-600 font-black">{filteredProducts.length}</span> کالا از مجموع {products.length} کالا
            </span>

            {/* Active search filter badge */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                <span>جستجو: «{searchQuery}»</span>
                <button onClick={() => setSearchQuery("")} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Active category filter badge */}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                <span>رسته: {CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory}</span>
                <button onClick={() => setSelectedCategory("")} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Active min price badge */}
            {minPriceInput.trim() && (
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                <span>حداقل: {minPriceInput} ریال</span>
                <button onClick={() => setMinPriceInput("")} className="hover:text-amber-950 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Active max price badge */}
            {maxPriceInput.trim() && (
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                <span>حداکثر: {maxPriceInput} ریال</span>
                <button onClick={() => setMaxPriceInput("")} className="hover:text-amber-950 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Active only with price badge */}
            {onlyWithPrice && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                <span>فقط قیمت‌دار</span>
                <button onClick={() => setOnlyWithPrice(false)} className="hover:text-emerald-950 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>پاکسازی همه فیلترها</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Products */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 sm:p-16 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Layers className="h-8 w-8 stroke-1" />
          </div>
          <h4 className="font-black text-slate-800 text-base mb-1">هیچ محصولی با این مشخصات یافت نشد</h4>
          <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
            با معیارهای انتخابی شما (جستجو، رسته یا بازه قیمت)، محصولی پیدا نشد. لطفاً بازه قیمت را تغییر دهید یا عبارت دیگری جستجو کنید.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
            >
              حذف تمام فیلترها و نمایش همه کالاها
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.slice((productsPage - 1) * 8, productsPage * 8).map((product, index) => {
              const parentUnit = getProductUnit(product);
              const categoryObj = parentUnit
                ? CATEGORIES.find((c) => c.id === parentUnit.category)
                : null;
              const numericPrice = parseNumericPrice(product.price);

              return (
                <motion.div
                  key={`${product.id}-${index}`}
                  whileHover={{ y: -4 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.3) }}
                  className="bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="relative h-44 w-full bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden">
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
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-black shadow-xs backdrop-blur-md border ${
                        numericPrice && numericPrice > 0
                          ? "bg-slate-950/85 text-white border-white/10"
                          : "bg-amber-500/90 text-white border-white/20"
                      }`}>
                        {product.price && numericPrice && numericPrice > 0
                          ? `${formatPrice(product.price)} ریال`
                          : "تماس بگیرید / توافقی"}
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-black text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200">
                        {product.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {product.description || "بدون توضیحات تکمیلی کالا."}
                      </p>
                    </div>

                    {/* Parent Industrial Unit Info Row */}
                    {parentUnit && (
                      <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-slate-400">تولیدکننده:</span>
                          <span className="text-xs font-black text-slate-800 truncate max-w-[140px]" title={parentUnit.name}>
                            {parentUnit.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 font-bold">
                          <span>رسته:</span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
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
                      className="w-full px-4 py-2.5 bg-indigo-50/50 group-hover:bg-indigo-600 hover:!bg-indigo-700 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-700 group-hover:text-white font-extrabold transition-all duration-200 cursor-pointer"
                    >
                      <span>مشخصات و تماس با کارگاه</span>
                      <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform duration-200" />
                    </button>
                  ) : (
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold">
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
                      ? "bg-indigo-600 text-white shadow-xs shadow-indigo-100"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
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
