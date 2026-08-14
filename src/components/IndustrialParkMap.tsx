import React, { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Unit, CATEGORIES } from "../types";
import { 
  MapPin, 
  Navigation, 
  Search, 
  SlidersHorizontal, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Compass, 
  Building2, 
  Phone, 
  Star, 
  ChevronLeft, 
  ExternalLink,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Factory
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IndustrialParkMapProps {
  units: Unit[];
  onSelectUnit: (unit: Unit) => void;
  selectedUnitId?: string | null;
}

// Default center for Zavieh Industrial Park (شهرک صنعتی زاویه)
const DEFAULT_CENTER: [number, number] = [35.3812, 50.5225];
const DEFAULT_ZOOM = 15;

// Color palette per industrial category
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; hex: string }> = {
  metals: { bg: "bg-blue-500", border: "border-blue-600", text: "text-blue-600", hex: "#3b82f6" },
  chemicals: { bg: "bg-amber-500", border: "border-amber-600", text: "text-amber-600", hex: "#f59e0b" },
  wood_paper: { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-emerald-600", hex: "#10b981" },
  food_pharma: { bg: "bg-rose-500", border: "border-rose-600", text: "text-rose-600", hex: "#f43f5e" },
  textiles: { bg: "bg-purple-500", border: "border-purple-600", text: "text-purple-600", hex: "#a855f7" },
  electronics: { bg: "bg-cyan-500", border: "border-cyan-600", text: "text-cyan-600", hex: "#06b6d4" },
  materials: { bg: "bg-orange-500", border: "border-orange-600", text: "text-orange-600", hex: "#f97316" },
  others: { bg: "bg-indigo-500", border: "border-indigo-600", text: "text-indigo-600", hex: "#6366f1" },
};

// Map layer tile providers
const TILE_LAYERS = {
  streets: {
    name: "نقشه خیابان‌ها",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  satellite: {
    name: "ماهواره‌ای",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  },
  light: {
    name: "روشن (ساده)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  }
};

// Helper: Deterministic pseudo-coordinate for units without GPS coordinates based on their street address and id
function getUnitCoordinates(unit: Unit, index: number): [number, number] {
  if (unit.latitude && unit.longitude && !isNaN(unit.latitude) && !isNaN(unit.longitude)) {
    return [unit.latitude, unit.longitude];
  }

  // Generate a distinct grid location inside the industrial park
  const address = unit.address || "";
  let streetOffset = 0;
  if (address.includes("نرگس")) streetOffset = 0.0018;
  else if (address.includes("زنبق")) streetOffset = 0.0010;
  else if (address.includes("تلاشگران")) streetOffset = -0.0012;
  else if (address.includes("یاس")) streetOffset = -0.0020;
  else if (address.includes("ارغوان")) streetOffset = 0.0025;
  else if (address.includes("بلوار")) streetOffset = 0.0002;

  // Hash the id for unique placement along the road
  let hash = 0;
  for (let i = 0; i < unit.id.length; i++) {
    hash = (hash << 5) - hash + unit.id.charCodeAt(i);
    hash |= 0;
  }
  const normalizedIndex = (Math.abs(hash) % 100) / 100;
  const latOffset = (normalizedIndex - 0.5) * 0.004 + streetOffset;
  const lngOffset = (((Math.abs(hash * 31) % 100) / 100) - 0.5) * 0.006 + (index % 5) * 0.0008;

  return [
    DEFAULT_CENTER[0] + latOffset,
    DEFAULT_CENTER[1] + lngOffset
  ];
}

export default function IndustrialParkMap({ units, onSelectUnit, selectedUnitId }: IndustrialParkMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<"streets" | "satellite" | "light">("light");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showListSidebar, setShowListSidebar] = useState(true);

  // Compute coordinates for all units
  const mappedUnits = useMemo(() => {
    return units.map((u, idx) => ({
      ...u,
      resolvedCoords: getUnitCoordinates(u, idx),
      hasRealGps: !!(u.latitude && u.longitude)
    }));
  }, [units]);

  // Filtered units for display
  const filteredUnits = useMemo(() => {
    return mappedUnits.filter(u => {
      const matchCat = !selectedCategory || u.category === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.description && u.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [mappedUnits, selectedCategory, searchQuery]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false, // we will add custom styled zoom buttons
        attributionControl: false
      });

      // Add Tile Layer
      const currentTile = TILE_LAYERS[activeLayer];
      const tile = L.tileLayer(currentTile.url, {
        attribution: currentTile.attribution,
        maxZoom: 19
      }).addTo(map);
      tileLayerRef.current = tile;

      // Add Attribution at bottom right
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Invalidate size on fullscreen change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Update Tile Layer when layer switch occurs
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const currentTile = TILE_LAYERS[activeLayer];
    const tile = L.tileLayer(currentTile.url, {
      attribution: currentTile.attribution,
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tile;
  }, [activeLayer]);

  // Render Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((marker: L.Marker) => {
      if (marker && typeof marker.remove === "function") {
        marker.remove();
      }
    });
    markersRef.current = {};

    const markerGroup = L.featureGroup();

    filteredUnits.forEach((unit) => {
      const catConfig = CATEGORY_COLORS[unit.category] || CATEGORY_COLORS.others;
      const isSelected = activeUnit?.id === unit.id;

      // Custom HTML Pin
      const iconHtml = `
        <div class="group relative flex items-center justify-center cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-115'}">
          <div class="w-9 h-9 rounded-2xl shadow-lg flex items-center justify-center text-white border-2 border-white transition-all" style="background-color: ${catConfig.hex}; box-shadow: 0 4px 12px ${catConfig.hex}60;">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="absolute -bottom-1.5 w-2 h-2 rotate-45 border-r border-b border-white" style="background-color: ${catConfig.hex};"></div>
          <div class="absolute -top-7 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            ${unit.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-industrial-pin",
        html: iconHtml,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42]
      });

      const marker = L.marker(unit.resolvedCoords, { icon: customIcon });

      marker.on("click", () => {
        setActiveUnit(unit);
        map.flyTo(unit.resolvedCoords, Math.max(map.getZoom(), 16), { duration: 0.8 });
      });

      marker.addTo(map);
      markerGroup.addLayer(marker);
      markersRef.current[unit.id] = marker;
    });

    // Auto fit bounds if units exist and not manually viewing
    if (filteredUnits.length > 0 && !activeUnit) {
      try {
        const bounds = markerGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
        } else {
          map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        }
      } catch (e) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      }
    }
  }, [filteredUnits, activeUnit]);

  // Handle unit selection from props
  useEffect(() => {
    if (selectedUnitId && mapInstanceRef.current) {
      const found = mappedUnits.find(u => u.id === selectedUnitId);
      if (found) {
        setActiveUnit(found);
        mapInstanceRef.current.flyTo(found.resolvedCoords, 17, { duration: 1 });
      }
    }
  }, [selectedUnitId, mappedUnits]);

  // Fly to unit handler
  const handleFlyToUnit = (unit: typeof mappedUnits[0]) => {
    setActiveUnit(unit);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(unit.resolvedCoords, 17, { duration: 0.8 });
    }
  };

  // Recenter Map
  const handleRecenter = () => {
    setActiveUnit(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    }
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div 
      className={`relative w-full bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen" : "min-h-[580px] h-[650px]"
      }`}
      style={{ direction: "rtl" }}
    >
      {/* Top Header & Search Bar Overlay */}
      <div className="absolute top-4 inset-x-4 z-30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pointer-events-none">
        
        {/* Search & Stats Box */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200 pointer-events-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی کارگاه در نقشه شهرک..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-9 py-2 text-xs font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Unit count pill */}
          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl whitespace-nowrap">
            {filteredUnits.length} واحد
          </span>
        </div>

        {/* Map Control Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto self-end md:self-auto">
          {/* Layer switcher */}
          <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-slate-200">
            {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((key) => (
              <button
                key={key}
                onClick={() => setActiveLayer(key)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeLayer === key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>

          {/* Sidebar Toggle (Desktop) */}
          <button
            onClick={() => setShowListSidebar(!showListSidebar)}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 font-bold text-xs rounded-2xl shadow-lg border border-slate-200 transition-all cursor-pointer"
            title="نمایش/مخفی لیست کارگاه‌ها"
          >
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span>{showListSidebar ? "بستن لیست" : "لیست کارگاه‌ها"}</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-700 rounded-2xl shadow-lg border border-slate-200 transition-all cursor-pointer"
            title={isFullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Category Pills Filter Bar */}
      <div className="absolute top-20 inset-x-4 z-20 overflow-x-auto pb-2 scrollbar-none pointer-events-auto flex items-center gap-1.5">
        <button
          onClick={() => setSelectedCategory("")}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md border cursor-pointer ${
            selectedCategory === ""
              ? "bg-slate-900 text-white border-slate-700 shadow-slate-900/40"
              : "bg-white/90 hover:bg-white text-slate-700 border-slate-200"
          }`}
        >
          همه صنایع ({units.length})
        </button>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = units.filter(u => u.category === cat.id).length;
          const catConfig = CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.others;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? "" : cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md backdrop-blur-md border cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-700"
                  : "bg-white/90 hover:bg-white text-slate-700 border-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catConfig.hex }} />
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* The Actual Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Map Action Controls (Zoom, Recenter) */}
      <div className="absolute bottom-6 right-4 z-30 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleRecenter}
          className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl shadow-lg border border-slate-200 transition-all cursor-pointer flex items-center justify-center group"
          title="مرکز شهرک صنعتی"
        >
          <Compass className="h-5 w-5 text-indigo-600 group-hover:rotate-45 transition-transform" />
        </button>

        <div className="flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-slate-50 text-slate-700 font-black text-base transition-colors border-b border-slate-100 cursor-pointer"
            title="بزرگنمایی"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-slate-50 text-slate-700 font-black text-base transition-colors cursor-pointer"
            title="کوچک‌نمایی"
          >
            -
          </button>
        </div>
      </div>

      {/* Side Units List Panel (Collapsible on desktop) */}
      <AnimatePresence>
        {showListSidebar && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="hidden md:flex absolute top-36 left-4 bottom-6 w-80 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200 z-30 flex-col overflow-hidden pointer-events-auto"
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span className="font-extrabold text-xs text-slate-800">واحدهای صنعتی روی نقشه</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                {filteredUnits.length} مورد
              </span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {filteredUnits.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">هیچ کارگاهی مطابق فیلتر یافت نشد</p>
                </div>
              ) : (
                filteredUnits.map((u) => {
                  const isCurrent = activeUnit?.id === u.id;
                  const catConfig = CATEGORY_COLORS[u.category] || CATEGORY_COLORS.others;

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleFlyToUnit(u)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isCurrent
                          ? "bg-indigo-50 border-indigo-200 shadow-sm"
                          : "bg-white hover:bg-slate-50 border-slate-100"
                      }`}
                    >
                      {/* Photo / Initial */}
                      <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <Factory className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-800 truncate">{u.name}</h4>
                          <span 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: catConfig.hex }}
                            title={u.category} 
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span>{u.address || "شهرک صنعتی"}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Unit Bottom Card / Detail Preview */}
      <AnimatePresence>
        {activeUnit && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="absolute bottom-6 inset-x-4 md:right-20 md:left-auto md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-40 p-4 pointer-events-auto overflow-hidden"
          >
            {/* Close card button */}
            <button
              onClick={() => setActiveUnit(null)}
              className="absolute left-3 top-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              {/* Logo / Image */}
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                {activeUnit.profileImage ? (
                  <img src={activeUnit.profileImage} alt={activeUnit.name} className="w-full h-full object-cover" />
                ) : (
                  <Factory className="h-8 w-8 text-slate-400" />
                )}
              </div>

              {/* Title & Info */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {CATEGORIES.find(c => c.id === activeUnit.category)?.name || "واحد صنعتی"}
                  </span>
                  {activeUnit.averageRating ? (
                    <div className="flex items-center gap-0.5 text-amber-600 text-[10px] font-bold">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{activeUnit.averageRating.toFixed(1)}</span>
                    </div>
                  ) : null}
                </div>

                <h3 className="font-extrabold text-sm text-slate-800 truncate mt-1">
                  {activeUnit.name}
                </h3>

                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>{activeUnit.address}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => onSelectUnit(activeUnit)}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-indigo-100 cursor-pointer"
              >
                <span>مشاهده پروفایل کامل</span>
                <ChevronLeft className="h-4 w-4" />
              </button>

              {activeUnit.phone && (
                <a
                  href={`tel:${activeUnit.phone}`}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-colors flex items-center justify-center"
                  title="تماس با کارگاه"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}

              {activeUnit.mapUrl && (
                <a
                  href={activeUnit.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center justify-center"
                  title="مسیریابی در نقشه نشان/گوگل"
                >
                  <Navigation className="h-4 w-4 text-indigo-600" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
