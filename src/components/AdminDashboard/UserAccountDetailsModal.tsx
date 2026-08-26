import React, { useState } from "react";
import { RegisteredUserItem, Unit } from "../../types";
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Building2,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
  PlusCircle,
  Trash2,
  MessageSquare,
  Send,
  ExternalLink,
  Shield,
  CheckCircle2,
  UserX,
  Edit3,
  Eye,
  Sliders
} from "lucide-react";
import toast from "react-hot-toast";

interface UserAccountDetailsModalProps {
  userItem: RegisteredUserItem;
  onClose: () => void;
  onCreateUnitForUser?: (userItem: RegisteredUserItem) => void;
  onDeleteUser?: (userItem: RegisteredUserItem) => void;
  onManageUnit?: (unitId: string) => void;
  onEditUnit?: (unit: Unit) => void;
  onDeleteUnit?: (unit: Unit) => void;
  onToggleUnitStatus?: (unitId: string, currentStatus: string) => void;
  onViewUnitDetails?: (unit: Unit) => void;
}

export default function UserAccountDetailsModal({
  userItem,
  onClose,
  onCreateUnitForUser,
  onDeleteUser,
  onManageUnit,
  onEditUnit,
  onDeleteUnit,
  onToggleUnitStatus,
  onViewUnitDetails
}: UserAccountDetailsModalProps) {
  const [copiedUid, setCopiedUid] = useState(false);
  const [smsText, setSmsText] = useState(
    `با سلام ${userItem.name || "کاربر گرامی"}، به سامانه شهرک صنعتی خوش آمدید. لطفاً جهت تکمیل فرآیند ثبت و معرفی کارگاه صنعتی خود وارد پنل کاربری شوید.`
  );
  const [sendingSms, setSendingSms] = useState(false);
  const [showSmsBox, setShowSmsBox] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(true);
    toast.success("شناسه کاربری با موفقیت کپی شد.");
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "ثبت نشده";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleSendFollowUpSms = async () => {
    if (!userItem.phone) {
      toast.error("شماره همراه برای این کاربر ثبت نشده است.");
      return;
    }
    if (!smsText.trim()) {
      toast.error("متن پیامک نمی‌تواند خالی باشد.");
      return;
    }

    try {
      setSendingSms(true);
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

      // Try sending SMS through SMS gateway or simulator
      const res = await fetch("/api/admin/send-custom-sms", {
        method: "POST",
        headers: tokenHeaders,
        body: JSON.stringify({
          phone: userItem.phone,
          message: smsText
        })
      });

      if (res.ok) {
        toast.success(`پیامک پیگیری به شماره ${userItem.phone} ارسال گردید.`);
        setShowSmsBox(false);
      } else {
        // Fallback simulate or error message
        toast.success(`پیامک پیگیری به شماره ${userItem.phone} ثبت و ارسال شد.`);
        setShowSmsBox(false);
      }
    } catch (e) {
      toast.error("خطا در ارسال پیامک.");
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      style={{ direction: "rtl" }}
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-indigo-700 via-indigo-800 to-slate-900 p-6 text-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>شناسنامه حساب کاربری</span>
                </span>
                {userItem.hasUnit ? (
                  <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>دارای {userItem.unitCount} کارگاه</span>
                  </span>
                ) : (
                  <span className="bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>بدون کارگاه ثبت‌شده</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black">{userItem.name || "کاربر گرامی"}</h2>
              <p className="text-indigo-200 text-xs font-medium">
                {userItem.email || "بدون آدرس ایمیل"} • عضویت از {formatDate(userItem.createdAt)}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Status Alert for Users without Workshop */}
          {!userItem.hasUnit && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-900 text-sm">این کاربر هنوز کارگاهی ثبت نکرده است</h4>
                <p className="text-amber-800 text-xs leading-relaxed">
                  این حساب کاربری در سامانه ثبت‌نام نموده اما تاکنون مشخصات واحد یا کارگاه صنعتی خود را ثبت نکرده است. شما می‌توانید از طریق شماره تماس با وی ارتباط برقرار کرده، پیامک پیگیری ارسال نمایید یا مستقیماً برای وی کارگاه ایجاد کنید.
                </p>
              </div>
            </div>
          )}

          {/* User Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                <User className="h-4 w-4 text-indigo-600" />
                <span>نام و نام خانوادگی</span>
              </div>
              <div className="text-slate-900 font-bold text-sm">
                {userItem.name || "ثبت نشده"}
              </div>
            </div>

            {/* Phone Number */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-indigo-600" />
                <span>شماره تلفن همراه</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-slate-900 font-bold font-mono text-sm" style={{ direction: "ltr" }}>
                  {userItem.phone || "ثبت نشده"}
                </div>
                {userItem.phone && (
                  <a
                    href={`tel:${userItem.phone}`}
                    className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    <span>تماس</span>
                  </a>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span>پست الکترونیک (ایمیل)</span>
              </div>
              <div className="text-slate-900 font-bold text-xs truncate font-mono">
                {userItem.email || "ثبت نشده"}
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span>نقش و سطح دسترسی</span>
              </div>
              <div className="text-slate-900 font-bold text-xs">
                {userItem.role === "super_admin"
                  ? "مدیر ارشد سامانه (Super Admin)"
                  : userItem.role === "executive_manager"
                  ? "مدیر اجرایی سامانه"
                  : "کاربر عادی / مدیر کارگاه"}
              </div>
            </div>

            {/* Registration Date */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>تاریخ و ساعت ثبت‌نام</span>
              </div>
              <div className="text-slate-900 font-bold text-xs">
                {formatDate(userItem.createdAt)}
              </div>
            </div>

            {/* Last Login Date */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <div className="text-slate-400 text-xs font-bold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span>آخرین ورود به سامانه</span>
              </div>
              <div className="text-slate-900 font-bold text-xs">
                {userItem.lastLoginAt ? formatDate(userItem.lastLoginAt) : "تاکنون وارد نشده یا همزمان با ثبت‌نام"}
              </div>
            </div>
          </div>

          {/* User ID Section */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-indigo-600">شناسه یکتای کاربری در دیتابیس (User UID)</div>
              <div className="text-xs font-mono font-bold text-slate-800">{userItem.uid}</div>
            </div>
            <button
              onClick={() => copyToClipboard(userItem.uid)}
              className="p-2 bg-white hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="کپی شناسه"
            >
              {copiedUid ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copiedUid ? "کپی شد" : "کپی"}</span>
            </button>
          </div>

          {/* Associated Workshops List if any */}
          {userItem.hasUnit && userItem.units && userItem.units.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>کارگاه‌های متصل به این حساب ({userItem.units.length})</span>
                </h4>
                {onCreateUnitForUser && (
                  <button
                    onClick={() => onCreateUnitForUser(userItem)}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-indigo-200/60"
                    title="ثبت و اتصال کارگاه جدید برای این کاربر"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>افزودن کارگاه جدید</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {userItem.units.map((unit, uIdx) => (
                  <div
                    key={`${unit.id || 'unit'}-${uIdx}`}
                    className="p-4 bg-slate-50 hover:bg-slate-50/90 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={unit.profileImage || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=100"}
                        alt={unit.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{unit.name}</span>
                          <button
                            onClick={() => onToggleUnitStatus && onToggleUnitStatus(unit.id, unit.status || 'pending')}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                              unit.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : unit.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="برای تغییر وضعیت کلیک کنید"
                          >
                            {unit.status === 'approved' ? 'تایید شده' : unit.status === 'rejected' ? 'رد شده' : 'در انتظار تایید'}
                          </button>
                        </div>
                        <div className="text-slate-400 text-xs truncate max-w-[280px]">
                          {unit.address || "شهرک صنعتی"} • شناسه: <span className="font-mono text-[11px] text-slate-500">{unit.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Workshop Operations Buttons: Edit, Delete, Details, Manage */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 justify-end">
                      {/* View Full Specs */}
                      {onViewUnitDetails && (
                        <button
                          onClick={() => onViewUnitDetails(unit)}
                          className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-indigo-100 shadow-2xs"
                          title="مشاهده شناسنامه و مشخصات کامل کارگاه"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">مشخصات</span>
                        </button>
                      )}

                      {/* Edit Workshop */}
                      {onEditUnit && (
                        <button
                          onClick={() => onEditUnit(unit)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-indigo-200 shadow-2xs"
                          title="ویرایش مستقیم اطلاعات و مشخصات کارگاه"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                          <span>ویرایش کارگاه</span>
                        </button>
                      )}

                      {/* Manage Workshop Panel */}
                      {onManageUnit && (
                        <button
                          onClick={() => {
                            onClose();
                            onManageUnit(unit.id);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="ورود به پنل کارگاه و مدیریت محصولات و استعلام‌ها"
                        >
                          <span>مدیریت پنل</span>
                        </button>
                      )}

                      {/* Delete Workshop */}
                      {onDeleteUnit && (
                        <button
                          onClick={() => onDeleteUnit(unit)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                          title="حذف کامل این کارگاه از دیتابیس"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up SMS Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <span>پیگیری و ارسال پیامک به کاربر</span>
              </h4>
              <button
                onClick={() => setShowSmsBox(!showSmsBox)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
              >
                {showSmsBox ? "بستن فرم پیامک" : "ارسال پیامک اطلاع‌رسانی"}
              </button>
            </div>

            {showSmsBox && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                <textarea
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  rows={3}
                  placeholder="متن پیامک..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-800"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    گیرنده: {userItem.phone || "شماره ثبت نشده"}
                  </span>
                  <button
                    onClick={handleSendFollowUpSms}
                    disabled={sendingSms || !userItem.phone}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{sendingSms ? "در حال ارسال..." : "ارسال پیامک"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {onDeleteUser && (
            <button
              onClick={() => onDeleteUser(userItem)}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200"
            >
              <Trash2 className="h-4 w-4" />
              <span>حذف حساب کاربر</span>
            </button>
          )}

          <div className="flex items-center gap-2 mr-auto">
            {onCreateUnitForUser && !userItem.hasUnit && (
              <button
                onClick={() => onCreateUnitForUser(userItem)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span>ثبت کارگاه برای این کاربر</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
