import React from "react";
import { Unit, CATEGORIES } from "../types";
import { Phone, MapPin, ChevronLeft, Factory, Star, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import BadgePill from "./BadgePill";

interface UnitCardProps {
  key?: any;
  unit: Unit;
  onSelect: (unit: Unit) => void;
}

export default function UnitCard({ unit, onSelect }: UnitCardProps) {
  const categoryObj = CATEGORIES.find(c => c.id === unit.category);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full cursor-pointer overflow-hidden group"
      onClick={() => onSelect(unit)}
    >
      {/* Top Graphic / Photo Area */}
      <div className="relative h-40 w-full bg-slate-50 flex items-center justify-center border-b border-slate-100 overflow-hidden">
        {unit.profileImage ? (
          <img
            src={unit.profileImage}
            alt={unit.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300">
            <Factory className="h-12 w-12 stroke-1 group-hover:scale-110 transition-transform duration-300 text-slate-300" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-2">تصویر کارگاه</span>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/90 text-white shadow-sm backdrop-blur-sm">
            {categoryObj?.name || "صنایع تولیدی"}
          </span>
        </div>
      </div>

      {/* Main Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200 flex items-center gap-1.5">
              {unit.name}
              {unit.status === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" title="تایید شده" />}
            </h3>
            {unit.reviewCount ? (
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md shrink-0">
                <span className="font-bold text-amber-600 text-xs">{unit.averageRating?.toFixed(1)}</span>
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              </div>
            ) : null}
          </div>

          {/* Official Verification Badges */}
          {unit.badges && unit.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {unit.badges.slice(0, 2).map((b, bIdx) => (
                <BadgePill key={`${unit.id}-badge-${b}-${bIdx}`} badgeId={b} size="xs" />
              ))}
              {unit.badges.length > 2 && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  +{unit.badges.length - 2}
                </span>
              )}
            </div>
          )}
          
          <p className="text-xs text-slate-500 font-normal line-clamp-2 leading-relaxed mb-4">
            {unit.description || "این واحد تولیدی هنوز توضیحی برای کارگاه خود ثبت نکرده است."}
          </p>
        </div>

        {/* Info Rows */}
        <div className="space-y-2 border-t border-slate-50 pt-4">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-mono tracking-wide">{unit.phone}</span>
          </div>
          
          <div className="flex items-start gap-2 text-slate-600 text-xs leading-tight">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{unit.address}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold group-hover:bg-indigo-50/50 transition-colors duration-200">
        <span>مشاهده جزئیات و محصولات</span>
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
      </div>
    </motion.div>
  );
}

