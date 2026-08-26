import React from "react";
import { Unit, UserProfile } from "../../types";
import { CustomUser } from "../../lib/customAuth";
import UnitForm from "../Dashboard/UnitForm";
import { X, Building2, Edit3 } from "lucide-react";

interface AdminEditUnitModalProps {
  unit: Unit;
  user: CustomUser;
  profile: UserProfile | null;
  onClose: () => void;
  onSaveSuccess: (updatedUnit: Unit) => void;
}

export default function AdminEditUnitModal({
  unit,
  user,
  profile,
  onClose,
  onSaveSuccess,
}: AdminEditUnitModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      style={{ direction: "rtl" }}
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-indigo-700 via-indigo-800 to-slate-900 p-6 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>مدیریت و ویرایش کارگاه</span>
                </span>
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2.5 py-0.5 rounded-full text-xs font-mono">
                  شناسه: {unit.id}
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">
                ویرایش مشخصات کارگاه: {unit.name}
              </h3>
              <p className="text-xs text-indigo-200">
                مالک / کاربر ثبت‌نامی: {unit.ownerUser?.name || unit.ownerId || "کاربر سامانه"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="بستن پنجره"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with UnitForm */}
        <div className="p-6 overflow-y-auto">
          <UnitForm
            unit={unit}
            user={{
              ...user,
              uid: unit.ownerId || user.uid,
            }}
            profile={profile}
            onSave={(saved) => {
              onSaveSuccess(saved);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
