import React, { useState, useEffect } from "react";
import { IndustrialCapacity, CAPACITY_MACHINE_TYPES, Unit, Product } from "../../types";
import { CustomUser } from "../../lib/customAuth";
import BadgePill from "../BadgePill";
import CapacityFormModal from "./CapacityFormModal";
import { 
  Cpu, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Clock, 
  Coins, 
  CheckCircle2, 
  SlidersHorizontal, 
  Building2, 
  Factory, 
  User, 
  Share2, 
  MessageSquare, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Wrench, 
  Filter,
  RefreshCw,
  X,
  ExternalLink,
  ChevronLeft,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface IndustrialCapacitiesPageProps {
  units: Unit[];
  user: CustomUser | null;
  onOpenAuth: () => void;
  onSelectUnit?: (unit: Unit) => void;
  onSwitchToClassifieds?: () => void;
}

export default function IndustrialCapacitiesPage({
  units = [],
  user,
  onOpenAuth,
  onSelectUnit,
  onSwitchToClassifieds
}: IndustrialCapacitiesPageProps) {
  const [capacities, setCapacities] = useState<IndustrialCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMachineType, setSelectedMachineType] = useState("all");
  const [selectedPricingType, setSelectedPricingType] = useState("all");
  const [onlyActiveStatus, setOnlyActiveStatus] = useState(false);

  // Modal for creating/editing capacity
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<IndustrialCapacity | null>(null);

  // Modal for Viewing Detail & Requesting Quote
  const [selectedCapacityForDetail, setSelectedCapacityForDetail] = useState<IndustrialCapacity | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [requestDesc, setRequestDesc] = useState("");
  const [requesterName, setRequesterName] = useState(user?.name || "");
  const [requesterPhone, setRequesterPhone] = useState(user?.phone || "");
  const [sendingRequest, setSendingRequest] = useState(false);

  const userUnits = user ? units.filter(u => u.ownerId === user.uid) : [];

  const fetchCapacities = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/capacities");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCapacities(data);
        }
      }
    } catch (err) {
      console.warn("Notice loading capacities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacities();
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredCapacities = capacities.filter(item => {
    // Machine category filter
    if (selectedMachineType !== "all" && item.machineType !== selectedMachineType) {
      return false;
    }

    // Pricing type filter
    if (selectedPricingType !== "all" && item.pricingType !== selectedPricingType) {
      return false;
    }

    // Status filter
    if (onlyActiveStatus && item.status !== "active") {
      return false;
    }

    // Search query
    if (cleanQuery) {
      const matchTitle = item.title?.toLowerCase().includes(cleanQuery);
      const matchSpecs = item.modelSpecs?.toLowerCase().includes(cleanQuery);
      const matchUnit = item.unitName?.toLowerCase().includes(cleanQuery);
      const matchDesc = item.description?.toLowerCase().includes(cleanQuery);
      const matchTags = item.tags && item.tags.some(t => t.toLowerCase().includes(cleanQuery));
      if (!matchTitle && !matchSpecs && !matchUnit && !matchDesc && !matchTags) {
        return false;
      }
    }

    return true;
  });

  const getMachineTypeIcon = (machineType: string) => {
    switch (machineType) {
      case "cnc_machining": return <Cpu className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case "laser_cutting": return <Sparkles className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
      case "plastic_injection": return <Factory className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "press_bending": return <Wrench className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      default: return <Cpu className="h-5 w-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getPricingBadge = (pricingType: string, rate?: string) => {
    switch (pricingType) {
      case "hourly":
        return (
          <div className="flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
            <Coins className="h-3.5 w-3.5" />
            <span>نرخ ساعتی: {rate || "استعلامی"}</span>
          </div>
        );
      case "per_piece":
        return (
          <div className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/60">
            <Coins className="h-3.5 w-3.5" />
            <span>محاسبه قطعه‌ای: {rate || "بر اساس تیراژ"}</span>
          </div>
        );
      case "contract":
        return (
          <div className="flex items-center gap-1 text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-100 dark:border-purple-900/60">
            <Coins className="h-3.5 w-3.5" />
            <span>قراردادی / شیفت: {rate || "توافقی"}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Coins className="h-3.5 w-3.5" />
            <span>قیمت توافقی بر اساس نقشه</span>
          </div>
        );
    }
  };

  const handleSendCapacityRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapacityForDetail) return;
    if (!requesterName.trim() || !requesterPhone.trim() || !requestDesc.trim()) {
      toast.error("لطفاً نام، شماره تماس و شرح درخواست را وارد فرمایید.");
      return;
    }

    setSendingRequest(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedCapacityForDetail.unitId || "capacity_request",
          productId: selectedCapacityForDetail.id,
          buyerName: requesterName,
          buyerPhone: requesterPhone,
          quantity: "استعلام ظرفیت دستگاه",
          description: `درخواست همکاری ظرفیت دستگاه [${selectedCapacityForDetail.title}]: ${requestDesc}`
        })
      });

      if (res.ok) {
        setQuoteSuccess(true);
        toast.success("درخواست همکاری و استعلام شما با موفقیت برای صاحب دستگاه ارسال شد.");
      } else {
        toast.error("خطا در ارسال درخواست.");
      }
    } catch (err) {
      toast.error("خطای شبکه.");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16" style={{ direction: "rtl" }}>
      {/* Sub-Navigation Tabs between Classifieds & Services Marketplace */}
      {onSwitchToClassifieds && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl max-w-md">
          <button
            type="button"
            onClick={onSwitchToClassifieds}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all cursor-pointer"
          >
            <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>استخدام و نیازمندی‌ها</span>
          </button>

          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/60 dark:border-slate-700 cursor-default"
          >
            <Wrench className="h-4 w-4" />
            <span>بازارگاه خدمات و ظرفیت‌ها</span>
          </button>
        </div>
      )}
      
      {/* Top Banner / Hero Header */}
      <div className="relative bg-gradient-to-l from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/60 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-500/30">
              <Cpu className="h-3.5 w-3.5" />
              <span>اشتراک‌گذاری ظرفیت‌های خالی و خدمات صنعتی (B2B)</span>
            </div>
            
            <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
              بازارگاه خدمات و ساعات خالی ماشین‌آلات صنعتی
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              همکاری و برون‌سپاری مستقیم بین کارخانجات و کارگاه‌های شهرک صنعتی: ساعات آزاد دستگاه‌های تراش و فرز CNC، برش لیزر، تزریق پلاستیک، پرس‌کاری، خط رنگ پودری و آبکاری.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                if (!user) {
                  onOpenAuth();
                  return;
                }
                setEditingCapacity(null);
                setIsFormModalOpen(true);
              }}
              className="px-5 py-3 bg-gradient-to-l from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>ثبت ظرفیت خالی دستگاه</span>
            </button>

            <button
              onClick={fetchCapacities}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center justify-center cursor-pointer"
              title="به‌روزرسانی آگهی‌ها"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Search Input & Quick Counts */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو در نوع دستگاه، مشخصات، نام کارگاه، متریال مجاز (استیل، آلومینیوم)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={onlyActiveStatus}
                onChange={e => setOnlyActiveStatus(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 h-4 w-4"
              />
              <span>فقط آماده پذیرش سفارش</span>
            </label>

            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              {filteredCapacities.length} ظرفیت فعال
            </span>
          </div>
        </div>

        {/* Machine Types Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CAPACITY_MACHINE_TYPES.map(cat => {
            const isSelected = selectedMachineType === cat.id;
            const count = cat.id === "all" 
              ? capacities.length 
              : capacities.filter(c => c.machineType === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedMachineType(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Capacities Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <span className="text-xs font-bold">در حال بارگذاری بازارگاه ماشین‌آلات صنعتی...</span>
        </div>
      ) : filteredCapacities.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
          <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">هیچ ظرفیت خالی در این رسته یافت نشد</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            کارگاه‌های تولیدی و صاحبان ماشین‌آلات می‌توانند از طریق دکمه بالا، ساعات خالی دستگاه‌های خود را به صورت رایگان ثبت نمایند.
          </p>
          <button
            onClick={() => {
              setSelectedMachineType("all");
              setSelectedPricingType("all");
              setSearchQuery("");
              setOnlyActiveStatus(false);
            }}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all cursor-pointer"
          >
            پاک کردن فیلترها
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCapacities.map((item, cIdx) => {
            const parentUnit = units.find(u => u.id === item.unitId);
            const verifiedBadges = parentUnit?.badges || [];

            return (
              <motion.div
                key={`${item.id || 'cap'}-${cIdx}`}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Top Row: Machine Type & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                        {getMachineTypeIcon(item.machineType)}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {item.machineTypeName || "خدمات ماشین‌آلات"}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              آماده پذیرش سفارش
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              در حال تکمیل ظرفیت
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      {item.availableCapacity}
                    </span>
                  </div>

                  {/* Title & Specs */}
                  <h3 className="font-black text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>

                  {item.modelSpecs && (
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 line-clamp-1 flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{item.modelSpecs}</span>
                    </p>
                  )}

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed font-normal">
                    {item.description || "پذیرش قطعات با دقت ابعادی بالا، نمونه‌سازی سریع و تولید انبوه."}
                  </p>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span key={`tag-${tag}-${idx}`} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-bold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Middle: Pricing & Workshop Provider */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    {getPricingBadge(item.pricingType, item.priceRate)}
                    {item.minOrder && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                        {item.minOrder}
                      </span>
                    )}
                  </div>

                  {/* Workshop provider & Badges */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {item.unitName}
                        </span>
                      </div>

                      {parentUnit && onSelectUnit && (
                        <button
                          onClick={() => onSelectUnit(parentUnit)}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                        >
                          شناسنامه کارگاه
                        </button>
                      )}
                    </div>

                    {/* Verified Badges Preview */}
                    {verifiedBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {verifiedBadges.slice(0, 2).map((badge, bIdx) => (
                          <BadgePill key={`cap-badge-${badge}-${bIdx}`} badgeKeyOrName={badge} size="xs" />
                        ))}
                      </div>
                    )}

                    {item.workshopAddress && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.workshopAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${item.contactPhone}`}
                    className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>تماس مستقیم</span>
                  </a>

                  <button
                    onClick={() => {
                      setSelectedCapacityForDetail(item);
                      setQuoteSuccess(false);
                      setRequestDesc("");
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>استعلام آنلاین</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal for Viewing Full Technical Details & Online Quote Request */}
      {selectedCapacityForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in duration-150">
            
            <div className="bg-gradient-to-l from-indigo-800 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <Cpu className="h-6 w-6 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-black text-base line-clamp-1">{selectedCapacityForDetail.title}</h3>
                  <p className="text-xs text-indigo-200">{selectedCapacityForDetail.unitName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCapacityForDetail(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Specs & Capacity Summary */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[11px]">دسته‌بندی دستگاه:</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">{selectedCapacityForDetail.machineTypeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">ظرفیت در دسترس:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{selectedCapacityForDetail.availableCapacity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">محاسبه قیمت:</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">{selectedCapacityForDetail.priceRate || "توافقی"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">تلفن تماس:</span>
                  <a href={`tel:${selectedCapacityForDetail.contactPhone}`} className="font-black font-mono text-emerald-600 underline">
                    {selectedCapacityForDetail.contactPhone}
                  </a>
                </div>
              </div>

              {/* Full Description */}
              {selectedCapacityForDetail.description && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">توضیحات و مشخصات فنی:</span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    {selectedCapacityForDetail.description}
                  </p>
                </div>
              )}

              {/* Direct Request Form */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                  <span>ارسال استعلام و درخواست همکاری به این واحد</span>
                </h4>

                {quoteSuccess ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center text-emerald-800 dark:text-emerald-200 space-y-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                    <p className="font-black text-sm">درخواست استعلام شما با موفقیت ارسال شد.</p>
                    <p className="text-xs">مسئول کارگاه به زودی با شماره تماس شما ارتباط برقرار خواهد کرد.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSendCapacityRequest} className="space-y-3 font-semibold">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="نام و نام خانوادگی / نام شرکت *"
                        value={requesterName}
                        onChange={e => setRequesterName(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="شماره تماس جهت پاسخ *"
                        value={requesterPhone}
                        onChange={e => setRequesterPhone(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:border-indigo-500"
                      />
                    </div>

                    <textarea
                      rows={3}
                      required
                      placeholder="شرح قطعه، تیراژ مورد نیاز، جنس متریال و درخواست خود را بنویسید..."
                      value={requestDesc}
                      onChange={e => setRequestDesc(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 leading-relaxed"
                    />

                    <button
                      type="submit"
                      disabled={sendingRequest}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {sendingRequest && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>ارسال فرم استعلام به واحد تولیدی</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Form Modal for Adding / Editing */}
      <CapacityFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchCapacities}
        editingCapacity={editingCapacity}
        userUnits={userUnits}
        user={user}
      />

    </div>
  );
}
