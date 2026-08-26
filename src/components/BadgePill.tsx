import React from "react";
import { OFFICIAL_BADGES } from "../types";
import { 
  ShieldCheck, 
  Landmark, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Globe, 
  BadgeCheck 
} from "lucide-react";

export interface BadgePillProps {
  key?: any;
  badgeKeyOrName?: string;
  badgeId?: string;
  size?: "xs" | "sm" | "md";
  showTooltip?: boolean;
  showLabel?: boolean;
}


export default function BadgePill({ 
  badgeKeyOrName, 
  badgeId, 
  size = "xs", 
  showTooltip = true,
  showLabel = true
}: BadgePillProps) {
  const targetKey = badgeId || badgeKeyOrName || "";
  
  // Find matching badge by ID or Name
  const badgeDef = OFFICIAL_BADGES.find(
    b => b.id === targetKey || b.name === targetKey || targetKey.includes(b.name) || b.name.includes(targetKey)
  );

  const displayName = badgeDef ? badgeDef.name : targetKey;
  const description = badgeDef ? badgeDef.description : "نشان تایید شده شهرک صنعتی";

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "ShieldCheck":
        return <ShieldCheck className="h-3.5 w-3.5 shrink-0" />;
      case "Landmark":
        return <Landmark className="h-3.5 w-3.5 shrink-0" />;
      case "Sparkles":
        return <Sparkles className="h-3.5 w-3.5 shrink-0" />;
      case "Award":
        return <Award className="h-3.5 w-3.5 shrink-0" />;
      case "CheckCircle2":
        return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
      case "Globe":
        return <Globe className="h-3.5 w-3.5 shrink-0" />;
      default:
        return <BadgeCheck className="h-3.5 w-3.5 shrink-0" />;
    }
  };

  const colorClasses = badgeDef
    ? `${badgeDef.bgColor} ${badgeDef.textColor} ${badgeDef.borderColor}`
    : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[10px] gap-1",
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3 py-1.5 text-sm gap-2"
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg font-bold border shadow-2xs transition-all ${colorClasses} ${sizeClasses}`}
      title={showTooltip ? description : undefined}
    >
      {getIcon(badgeDef?.iconName)}
      {showLabel && <span className="truncate">{displayName}</span>}
    </span>
  );
}

