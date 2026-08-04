import React from "react";
import { CATEGORIES, Unit } from "../types";
import { Grid, Tag } from "lucide-react";

interface CategoryBarProps {
  units: Unit[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export default function CategoryBar({
  units,
  selectedCategory,
  setSelectedCategory,
}: CategoryBarProps) {
  // Calculate unit count per category in real-time
  const getCategoryCount = (categoryId: string) => {
    return units.filter((unit) => unit.category === categoryId).length;
  };

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-3 shadow-sm" style={{ direction: "rtl" }}>
      <div className="flex items-center gap-2 mb-2 px-1 text-slate-500">
        <Tag className="h-3.5 w-3.5 text-indigo-500" />
        <span className="text-[11px] font-bold">آمار صنایع و دسته‌بندی‌ها (فیلتر سریع):</span>
      </div>
      
      {/* Scrollable Row of Category Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {/* All Categories Button */}
        <button
          onClick={() => setSelectedCategory("")}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
            selectedCategory === ""
              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100"
              : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600"
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>همه دسته‌بندی‌ها</span>
          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
            selectedCategory === "" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {units.length}
          </span>
        </button>

        {/* Categories loop */}
        {CATEGORIES.map((cat) => {
          const count = getCategoryCount(cat.id);
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? "" : cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600"
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-indigo-400"}`} />
              <span>{cat.name}</span>
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
