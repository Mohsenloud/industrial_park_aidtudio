import React, { useState, useEffect } from "react";
import { IndustrialCapacity, CAPACITY_MACHINE_TYPES, Unit } from "../../types";
import { CustomUser } from "../../lib/customAuth";
import { 
  Cpu, 
  X, 
  Loader2, 
  Save, 
  Clock, 
  Coins, 
  Phone, 
  User, 
  MapPin, 
  Tag, 
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wrench
} from "lucide-react";
import toast from "react-hot-toast";

interface CapacityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCapacity?: IndustrialCapacity | null;
  userUnits?: Unit[];
  user: CustomUser | null;
}

export default function CapacityFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingCapacity,
  userUnits = [],
  user
}: CapacityFormModalProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    editingCapacity?.unitId || (userUnits.length > 0 ? userUnits[0].id : "")
  );
  const [unitName, setUnitName] = useState<string>(
    editingCapacity?.unitName || (userUnits.length > 0 ? userUnits[0].name : "")
  );
  const [title, setTitle] = useState(editingCapacity?.title || "");
  const [machineType, setMachineType] = useState(editingCapacity?.machineType || "cnc_machining");
  const [modelSpecs, setModelSpecs] = useState(editingCapacity?.modelSpecs || "");
  const [availableCapacity, setAvailableCapacity] = useState(editingCapacity?.availableCapacity || "");
  const [pricingType, setPricingType] = useState<"hourly" | "per_piece" | "negotiable" | "contract">(
    editingCapacity?.pricingType || "negotiable"
  );
  const [priceRate, setPriceRate] = useState(editingCapacity?.priceRate || "");
  const [minOrder, setMinOrder] = useState(editingCapacity?.minOrder || "");
  const [contactPhone, setContactPhone] = useState(
    editingCapacity?.contactPhone || (userUnits.length > 0 ? userUnits[0].phone || userUnits[0].mobile1 || "" : "")
  );
  const [contactPerson, setContactPerson] = useState(
    editingCapacity?.contactPerson || user?.name || ""
  );
  const [workshopAddress, setWorkshopAddress] = useState(
    editingCapacity?.workshopAddress || (userUnits.length > 0 ? userUnits[0].address : "")
  );
  const [description, setDescription] = useState(editingCapacity?.description || "");
  const [status, setStatus] = useState<"active" | "busy" | "inactive">(editingCapacity?.status || "active");
  const [tagsInput, setTagsInput] = useState(editingCapacity?.tags ? editingCapacity.tags.join("، ") : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedUnitId && userUnits.length > 0) {
      const u = userUnits.find(unit => unit.id === selectedUnitId);
      if (u) {
        setUnitName(u.name);
        if (!contactPhone) setContactPhone(u.phone || u.mobile1 || "");
        if (!workshopAddress) setWorkshopAddress(u.address);
      }
    }
  }, [selectedUnitId, userUnits]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("لطفاً عنوان ظرفیت یا خدمت دستگاه را وارد نمایید.");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error("لطفاً شماره تماس هماهنگی را وارد نمایید.");
      return;
    }

    const machineTypeObj = CAPACITY_MACHINE_TYPES.find(m => m.id === machineType);

    const parsedTags = tagsInput
      .split(/[,،]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const payload: Partial<IndustrialCapacity> = {
      unitId: selectedUnitId || undefined,
      unitName: unitName || "واحد صنعتی شهرک",
      ownerId: user?.uid,
      title: title.trim(),
      machineType,
      machineTypeName: machineTypeObj ? machineTypeObj.name : "خدمات ماشین‌آلات صنعتی",
      modelSpecs: modelSpecs.trim(),
      availableCapacity: availableCapacity.trim() || "آماده پذیرش سفارش صنعتی",
      pricingType,
      priceRate: priceRate.trim(),
      minOrder: minOrder.trim(),
      contactPhone: contactPhone.trim(),
      contactPerson: contactPerson.trim(),
      workshopAddress: workshopAddress.trim(),
      description: description.trim(),
      status,
      tags: parsedTags
    };

    setSaving(true);
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.token) {
            tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
          }
        } catch (_) {}
      }

      const url = editingCapacity ? `/api/capacities/${editingCapacity.id}` : "/api/capacities";
      const method = editingCapacity ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: tokenHeaders,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingCapacity ? "ظرفیت ماشین‌آلات با موفقیت ویرایش شد." : "ظرفیت خالی دستگاه با موفقیت در بازارگاه ثبت شد.");
        onSuccess();
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "خطا در ثبت اطلاعات ظرفیت.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" style={{ direction: "rtl" }}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-800 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Cpu className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-black text-base">
                {editingCapacity ? "ویرایش آگهی ظرفیت خالی ماشین‌آلات" : "ثبت ظرفیت خالی دستگاه و خدمات صنعتی"}
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                اشتراک‌گذاری ساعات آزاد ماشین‌آلات (CNC، برش، تزریق، پرس و...) جهت همکاری بین‌کارگاهی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
          
          {/* Workshop selection (if user has units) */}
          {userUnits.length > 0 ? (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <label className="block font-bold text-indigo-950 dark:text-indigo-200">
                انتخاب کارگاه مربوطه:
              </label>
              <select
                value={selectedUnitId}
                onChange={e => setSelectedUnitId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold"
              >
                {userUnits.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} (شناسه: {u.id})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">نام کارگاه یا شرکت ارائه‌دهنده *</label>
              <input
                type="text"
                required
                placeholder="مثلاً: کارگاه قالب‌سازی و تراش نوین"
                value={unitName}
                onChange={e => setUnitName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">عنوان آگهی ظرفیت یا خدمت *</label>
            <input
              type="text"
              required
              placeholder="مثلاً: ظرفیت خالی فرز CNC ۴ محوره و تراشکاری قطعات دقیق"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Machine Type & Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">دسته‌بندی دستگاه / خدمت *</label>
              <select
                value={machineType}
                onChange={e => setMachineType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold"
              >
                {CAPACITY_MACHINE_TYPES.filter(m => m.id !== "all").map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">مدل و مشخصات ابعادی دستگاه</label>
              <input
                type="text"
                placeholder="مثلاً: کورس ۸۰۰*۵۰۰*۵۰۰ - کنترلر هایدن‌هاین"
                value={modelSpecs}
                onChange={e => setModelSpecs(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Available Capacity & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">میزان ظرفیت خالی موجود</label>
              <input
                type="text"
                placeholder="مثلاً: ۶۰ ساعت در هفته / یا شیفت شب کامل"
                value={availableCapacity}
                onChange={e => setAvailableCapacity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">وضعیت پذیرش سفارش</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold"
              >
                <option value="active">🟢 آماده پذیرش سفارش (فعال)</option>
                <option value="busy">🟡 در حال تکمیل ظرفیت</option>
                <option value="inactive">⚪ موقتاً غیرفعال</option>
              </select>
            </div>
          </div>

          {/* Pricing Type & Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">نوع محاسبه قیمت</label>
              <select
                value={pricingType}
                onChange={e => setPricingType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold"
              >
                <option value="negotiable">توافقی بر اساس نقشه</option>
                <option value="hourly">ساعتی (نرخ ماشین‌کاری)</option>
                <option value="per_piece">قطعه‌ای / تیراژ</option>
                <option value="contract">قرارداد ماهانه / پروژه‌ای</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">نرخ تقریبی / توضیحات قیمت</label>
              <input
                type="text"
                placeholder="مثلاً: ساعتی ۱,۵۰۰,۰۰۰ ریال یا توافقی"
                value={priceRate}
                onChange={e => setPriceRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">حداقل تیراژ یا ساعت</label>
              <input
                type="text"
                placeholder="مثلاً: حداقل ۵۰ عدد یا بدون محدودیت"
                value={minOrder}
                onChange={e => setMinOrder(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">شماره تماس مستقیم *</label>
              <input
                type="text"
                required
                placeholder="مثلاً: ۰۲۱-۵۶۰۰۰۰ یا ۰۹۱۲۳۴۵۶۷۸۹"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">مسئول هماهنگی / فنی</label>
              <input
                type="text"
                placeholder="مثلاً: مهندس رضایی (سرپرست تولید)"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Workshop Address */}
          <div>
            <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">موقعیت و آدرس کارگاه در شهرک</label>
            <input
              type="text"
              placeholder="مثلاً: فاز ۲ - بلوک فلزی - پلاک ۱۲"
              value={workshopAddress}
              onChange={e => setWorkshopAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">توضیحات تکمیلی، متریال مجاز و استانداردهای قطعه</label>
            <textarea
              rows={3}
              placeholder="توضیحات درباره دقت ابعادی (تلرانس)، فرمت فایل‌های نقشه مجاز (DXF, STEP, DWG)، قابلیت تهیه متریال یا پذیرش جنس خام از مشتری..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">کلمات کلیدی و تگ‌ها (با کاما جدا کنید)</label>
            <input
              type="text"
              placeholder="استیل، آلومینیوم، فولاد، تیراژ بالا، نمونه‌سازی، قطعات دقیق، قالب‌سازی"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              <span>{editingCapacity ? "ذخیره تغییرات" : "ثبت آگهی ظرفیت خالی"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
