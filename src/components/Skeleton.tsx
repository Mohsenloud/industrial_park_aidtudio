import React from "react";

// Helper for repeated items
export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-md ${className}`} />
  );
}

// 1. Single Unit Card Skeleton
export function UnitCardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Top Photo Area */}
      <div className="relative h-40 w-full bg-slate-50 border-b border-slate-100">
        <SkeletonPulse className="h-full w-full rounded-none" />
        {/* Category Badge Placeholder */}
        <div className="absolute top-3 right-3">
          <SkeletonPulse className="h-6 w-20 rounded-lg" />
        </div>
      </div>

      {/* Main Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Title Placeholder */}
          <SkeletonPulse className="h-6 w-3/4 mb-3" />
          {/* Description Placeholder */}
          <div className="space-y-2">
            <SkeletonPulse className="h-3.5 w-full" />
            <SkeletonPulse className="h-3.5 w-5/6" />
          </div>
        </div>

        {/* Info Rows */}
        <div className="space-y-2 border-t border-slate-50 pt-4">
          <div className="flex items-center gap-2">
            <SkeletonPulse className="h-3.5 w-3.5 rounded-full" />
            <SkeletonPulse className="h-3.5 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonPulse className="h-3.5 w-3.5 rounded-full" />
            <SkeletonPulse className="h-3.5 w-40" />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <SkeletonPulse className="h-4 w-28" />
        <SkeletonPulse className="h-4 w-4 rounded-full" />
      </div>
    </div>
  );
}

// Grid of Unit Cards
export function UnitGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <UnitCardSkeleton key={idx} />
      ))}
    </div>
  );
}

// 2. Single Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      {/* Image Area */}
      <div className="h-48 bg-slate-50 border-b border-slate-100">
        <SkeletonPulse className="h-full w-full rounded-none" />
      </div>

      {/* P-4 Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Title Placeholder */}
          <SkeletonPulse className="h-4 w-2/3" />
          {/* Description Placeholder */}
          <SkeletonPulse className="h-3 w-full" />
          <SkeletonPulse className="h-3 w-5/6" />
        </div>

        {/* Footer info/price */}
        <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
          <SkeletonPulse className="h-3 w-16" />
          <SkeletonPulse className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </div>
  );
}

// 3. Single Classified Ad Skeleton
export function ClassifiedAdSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100/85 shadow-sm flex flex-col justify-between overflow-hidden">
      <div>
        {/* Photo area */}
        <div className="h-48 w-full bg-slate-50 relative border-b border-slate-100">
          <SkeletonPulse className="h-full w-full rounded-none" />
          {/* Tag badge placeholder */}
          <div className="absolute top-3 right-3">
            <SkeletonPulse className="h-5 w-16 rounded-lg" />
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <SkeletonPulse className="h-3.5 w-16" />
            </div>
            <SkeletonPulse className="h-4 w-3/4" />
          </div>

          {/* Description Block */}
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 space-y-1.5">
            <SkeletonPulse className="h-3 w-full" />
            <SkeletonPulse className="h-3 w-5/6" />
          </div>

          {/* Metadata */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2">
              <SkeletonPulse className="h-4 w-4 rounded-full" />
              <SkeletonPulse className="h-3.5 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonPulse className="h-4 w-4 rounded-full" />
              <SkeletonPulse className="h-3.5 w-40" />
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-5 pt-0 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2 pt-3">
          <SkeletonPulse className="h-8 w-8 rounded-full animate-pulse bg-slate-200" />
          <div className="space-y-1">
            <SkeletonPulse className="h-3 w-16" />
            <SkeletonPulse className="h-2.5 w-10" />
          </div>
        </div>
        <div className="pt-3">
          <SkeletonPulse className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ClassifiedGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ClassifiedAdSkeleton key={idx} />
      ))}
    </div>
  );
}

// 4. Banner Slide Skeleton
export function BannerSkeleton() {
  return (
    <div className="w-full relative h-44 sm:h-48 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-md p-6 sm:p-8 flex items-center justify-between">
      <div className="space-y-4 max-w-lg flex-1">
        {/* Company and badge */}
        <div className="flex items-center gap-2">
          <div className="animate-pulse bg-slate-800 h-5 w-24 rounded" />
          <div className="animate-pulse bg-slate-800 h-5 w-16 rounded" />
        </div>
        {/* Title */}
        <div className="animate-pulse bg-slate-800 h-6 w-5/6 rounded" />
        {/* Description */}
        <div className="space-y-2">
          <div className="animate-pulse bg-slate-800 h-3 w-full rounded" />
          <div className="animate-pulse bg-slate-800 h-3 w-4/5 rounded" />
        </div>
      </div>

      {/* Image Placeholder right side */}
      <div className="hidden sm:block w-40 h-full rounded-xl overflow-hidden mr-6">
        <div className="animate-pulse bg-slate-800 h-full w-full rounded-xl" />
      </div>
    </div>
  );
}

// 5. Dashboard / Panel Loading State
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse text-right" style={{ direction: "rtl" }}>
      {/* Header section placeholder */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <SkeletonPulse className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <SkeletonPulse className="h-6 w-48" />
            <SkeletonPulse className="h-3.5 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <SkeletonPulse className="h-10 w-28 rounded-xl" />
          <SkeletonPulse className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      {/* Main layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left sidebar / Quick Stats info */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 h-fit">
          <SkeletonPulse className="h-5 w-1/3" />
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <SkeletonPulse className="h-4 w-4 rounded-full" />
              <SkeletonPulse className="h-4 w-3/4" />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonPulse className="h-4 w-4 rounded-full" />
              <SkeletonPulse className="h-4 w-2/3" />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonPulse className="h-4 w-4 rounded-full" />
              <SkeletonPulse className="h-4 w-1/2" />
            </div>
          </div>
        </div>

        {/* Right main area - items lists */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <SkeletonPulse className="h-5 w-1/4" />
              <SkeletonPulse className="h-8 w-24 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border border-slate-50 rounded-2xl p-4 flex gap-3">
                <SkeletonPulse className="h-12 w-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <SkeletonPulse className="h-4 w-2/3" />
                  <SkeletonPulse className="h-3 w-1/2" />
                </div>
              </div>
              <div className="border border-slate-50 rounded-2xl p-4 flex gap-3">
                <SkeletonPulse className="h-12 w-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <SkeletonPulse className="h-4 w-2/3" />
                  <SkeletonPulse className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
