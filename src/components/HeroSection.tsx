import React, { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, Factory, Award, ShieldCheck, Users, Package, ArrowLeft, X } from "lucide-react";
import { CATEGORIES, Unit, Product } from "../types";
import { motion } from "motion/react";

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  units: Unit[];
  products: Product[];
  onSelectUnit: (unit: Unit) => void;
}

export default function HeroSection({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  units,
  products,
  onSelectUnit
}: HeroSectionProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside detection to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();

  // Find matching units (workshops)
  const matchingUnits = cleanQuery
    ? units.filter((unit) => {
        const matchesName = unit.name.toLowerCase().includes(cleanQuery);
        const matchesDesc = unit.description && unit.description.toLowerCase().includes(cleanQuery);
        const matchesKeywords = unit.seoKeywords && unit.seoKeywords.toLowerCase().includes(cleanQuery);
        const matchesCategory = !selectedCategory || unit.category === selectedCategory;
        return (matchesName || matchesDesc || matchesKeywords) && matchesCategory;
      }).slice(0, 5)
    : [];

  // Find matching products
  const matchingProducts = cleanQuery
    ? products.filter((product) => {
        const matchesName = product.name.toLowerCase().includes(cleanQuery);
        const matchesDesc = product.description && product.description.toLowerCase().includes(cleanQuery);
        const matchesKeywords = product.seoKeywords && product.seoKeywords.toLowerCase().includes(cleanQuery);
        
        // Find if its parent unit matches the category filter
        const parentUnit = units.find((u) => u.id === product.unitId);
        const matchesCategory = !selectedCategory || (parentUnit && parentUnit.category === selectedCategory);
        
        return (matchesName || matchesDesc || matchesKeywords) && matchesCategory;
      }).slice(0, 5)
    : [];

  const hasResults = matchingUnits.length > 0 || matchingProducts.length > 0;

  const handleSelectUnit = (unit: Unit) => {
    onSelectUnit(unit);
    setShowDropdown(false);
  };

  const handleSelectProduct = (product: Product) => {
    const parentUnit = units.find((u) => u.id === product.unitId);
    if (parentUnit) {
      onSelectUnit(parentUnit);
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full bg-slate-900 text-white py-6 sm:py-12 px-3.5 sm:px-6 lg:px-8 rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 shadow-xl border border-slate-800 overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[11px] sm:text-xs font-semibold mb-3 sm:mb-6 border border-indigo-500/20"
        >
          <Factory className="h-3 w-3" />
          <span>مرجع رسمی صنعتگران و تولیدکنندگان شهرک صنعتی</span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl sm:text-3xl lg:text-5xl font-extrabold tracking-tight mb-2 sm:mb-4 text-white leading-tight"
        >
          بانک اطلاعات و محصولات واحدهای تولیدی
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xs sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto mb-5 sm:mb-8 font-light leading-relaxed px-2"
        >
          به راحتی کارگاه‌ها و محصولات فعال در شهرک صنعتی را جستجو کنید. اگر صاحب کارگاه تولیدی هستید، با ایجاد حساب کاربری رایگان، اطلاعات و محصولات خود را برای عموم معرفی کنید.
        </motion.p>

        {/* Search Input Box with Live Dropdown */}
        <div ref={containerRef} className="relative max-w-2xl mx-auto z-30">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-2xl p-1.5 sm:p-2 shadow-xl flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 border border-slate-700/50"
          >
            <div className="relative w-full flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 sm:h-5 sm:w-5" />
              <input
                type="text"
                placeholder="جستجوی نام کارگاه، خدمات یا محصولات..."
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                className="w-full pl-8 sm:pl-10 pr-9 sm:pr-11 py-2.5 sm:py-3 text-slate-800 placeholder-slate-400 bg-transparent rounded-xl outline-none text-xs sm:text-sm font-medium focus:ring-0 text-right"
                style={{ direction: "rtl" }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowDropdown(false);
                  }}
                  className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              )}
            </div>
            
            <div className="flex w-full sm:w-auto items-center gap-1 sm:gap-2 border-t sm:border-t-0 sm:border-r border-slate-100 pt-1.5 sm:pt-0 sm:pr-2">
              <SlidersHorizontal className="text-slate-400 h-3.5 w-3.5 hidden sm:block" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setShowDropdown(true);
                }}
                className="w-full sm:w-44 py-2 sm:py-3 px-2 bg-slate-50 sm:bg-transparent rounded-lg sm:rounded-none text-slate-700 sm:text-slate-600 font-semibold text-xs outline-none cursor-pointer text-right"
                style={{ direction: "rtl" }}
              >
                <option value="">همه دسته‌بندی‌ها</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>

          {/* Live Search Dropdown Panel */}
          {showDropdown && cleanQuery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-right z-50 text-slate-800 max-h-[380px] overflow-y-auto"
              style={{ direction: "rtl" }}
            >
              {hasResults ? (
                <div className="p-2 space-y-3">
                  {/* Matching Units Section */}
                  {matchingUnits.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/80 rounded-lg">
                        کارگاه‌ها و واحدهای صنعتی
                      </div>
                      <div className="space-y-0.5">
                        {matchingUnits.map((unit) => (
                          <button
                            key={unit.id}
                            onClick={() => handleSelectUnit(unit)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/50 transition-colors text-right group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Factory className="h-4 w-4" />
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                                  {unit.name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[250px] font-medium">
                                  {unit.address}
                                </p>
                              </div>
                            </div>
                            <ArrowLeft className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Products Section */}
                  {matchingProducts.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/80 rounded-lg">
                        محصولات و کالاهای تولیدی
                      </div>
                      <div className="space-y-0.5">
                        {matchingProducts.map((product) => {
                          const parentUnit = units.find((u) => u.id === product.unitId);
                          return (
                            <button
                              key={product.id}
                              onClick={() => handleSelectProduct(product)}
                              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/50 transition-colors text-right group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  <Package className="h-4 w-4" />
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                                    {product.name}
                                  </p>
                                  {parentUnit && (
                                    <p className="text-[10px] text-slate-400 font-bold">
                                      تولیدکننده: {parentUnit.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {product.price && (
                                  <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                    {Number(product.price).toLocaleString("fa-IR")} ریال
                                  </span>
                                )}
                                <ArrowLeft className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  هیچ کارگاه یا محصولی منطبق با "
                  <span className="font-extrabold text-slate-600">{searchQuery}</span>" پیدا نشد.
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Feature stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-10 max-w-2xl mx-auto pt-4 sm:pt-8 border-t border-slate-800/80">
          <div className="text-center">
            <div className="flex justify-center text-indigo-400 mb-1">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">اطلاعات تأیید شده</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center text-indigo-400 mb-1">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">دسترسی مستقیم</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center text-indigo-400 mb-1">
              <Award className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">معرفی کالا و خدمات</p>
          </div>
        </div>
      </div>
    </div>
  );
}
