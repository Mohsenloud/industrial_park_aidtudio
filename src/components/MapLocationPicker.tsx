import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  MapPin, 
  Locate, 
  RotateCcw, 
  Layers, 
  Trash2, 
  CheckCircle2, 
  Navigation, 
  Info,
  Maximize2,
  Minimize2,
  HelpCircle,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

interface MapLocationPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number | undefined, lng: number | undefined) => void;
  onGenerateMapUrl?: (url: string) => void;
  category?: string;
  unitName?: string;
}

const DEFAULT_CENTER: [number, number] = [35.3812, 50.5225];
const DEFAULT_ZOOM = 15;

const TILE_LAYERS = {
  satellite: {
    name: "ماهواره‌ای (سوله و قطعات)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, Maxar'
  },
  streets: {
    name: "نقشه خیابان‌ها",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap'
  },
  light: {
    name: "روشن (ساده)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; CARTO'
  }
};

export default function MapLocationPicker({
  latitude,
  longitude,
  onChange,
  onGenerateMapUrl,
  category = "others",
  unitName
}: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<"satellite" | "streets" | "light">("satellite");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasCoords = typeof latitude === "number" && typeof longitude === "number" && !isNaN(latitude) && !isNaN(longitude);

  // Custom Leaflet Pin Icon
  const createPinIcon = () => {
    const iconHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: move; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <div style="width: 40px; height: 40px; border-radius: 50% 50% 50% 0; background: #4f46e5; border: 2px solid white; display: flex; align-items: center; justify-content: center; transform: rotate(-45deg);">
          <svg xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px; color: white; transform: rotate(45deg);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      </div>
    `;
    return L.divIcon({
      className: "custom-picker-pin bg-transparent border-0",
      html: iconHtml,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -48]
    });
  };

  // Initialize Map
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialCenter: [number, number] = hasCoords ? [latitude!, longitude!] : DEFAULT_CENTER;
    const initialZoom = hasCoords ? 17 : DEFAULT_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    const currentTile = TILE_LAYERS[activeLayer];
    const tile = L.tileLayer(currentTile.url, {
      attribution: currentTile.attribution,
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tile;

    // Handle Click on map to place pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      onChangeRef.current(lat, lng);
    });

    mapInstanceRef.current = map;

    return () => {
      try {
        map.remove();
      } catch (err) {
        console.error("Map remove cleanup error:", err);
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Invalidate map size on expand/collapse
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Update Layer
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

  // Update Marker when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hasCoords) {
      const pos: [number, number] = [latitude!, longitude!];

      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
      } else {
        const marker = L.marker(pos, {
          icon: createPinIcon(),
          draggable: true
        });

        marker.on("dragend", (e: any) => {
          const newPos = e.target.getLatLng();
          const lat = parseFloat(newPos.lat.toFixed(6));
          const lng = parseFloat(newPos.lng.toFixed(6));
          onChange(lat, lng);
          toast.success("موقعیت کارگاه به‌روز شد");
        });

        marker.addTo(map);
        markerRef.current = marker;
      }
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [latitude, longitude, hasCoords]);

  // Recenter map on coordinates when updated externally or placed
  const handlePanToCoords = (lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 0.8 });
    }
  };

  // Get User Current Location (GPS)
  const handleGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error("مرورگر شما از دریافت موقعیت مکانی پشتیبانی نمی‌کند.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        onChange(lat, lng);
        handlePanToCoords(lat, lng);
        toast.success("موقعیت کنونی شما دریافت و روی نقشه نشان شد!");
      },
      (error) => {
        setGpsLoading(false);
        console.error(error);
        toast.error("خطا در دریافت GPS. لطفاً دسترسی موقعیت مکانی مرورگر را تأیید کنید.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reset / Clear marker
  const handleClearLocation = () => {
    onChange(undefined, undefined);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    toast.success("نشان مکان کارگاه پاک شد.");
  };

  // Recenter to Industrial Park Center
  const handleRecenterPark = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    }
  };

  // Generate Google Map and Neshan Links helper
  const handleAutoFillLinks = () => {
    if (!hasCoords) {
      toast.error("ابتدا مکان کارگاه را روی نقشه انتخاب کنید.");
      return;
    }
    const googleMapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    if (onGenerateMapUrl) {
      onGenerateMapUrl(googleMapUrl);
      toast.success("لینک مسیریابی هوشمند در فیلد لینک مستقیم ثبت شد.");
    }
  };

  return (
    <div className="w-full space-y-3" style={{ direction: "rtl" }}>
      {/* Header bar of the picker */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 p-2.5 rounded-2xl border border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-sm">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
              <span>نشان‌گذاری موقعیت کارگاه روی نقشه</span>
              <span className="text-[10px] text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-full font-bold">
                تعاملی و دقیق
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              روی محل دقیق سوله یا واحد خود در نقشه زیر کلیک کنید (یا پین را جابجا کنید).
            </p>
          </div>
        </div>

        {/* Map Layers switch */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveLayer(key)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeLayer === key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {TILE_LAYERS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Display Container */}
      <div 
        className={`relative w-full rounded-2xl overflow-hidden border-2 transition-all shadow-inner ${
          hasCoords ? "border-indigo-500 shadow-indigo-100" : "border-slate-200"
        } ${isExpanded ? "h-[450px]" : "h-[280px] sm:h-[320px]"}`}
      >
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Top Hint Badge overlay */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 shadow-lg border border-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {hasCoords 
                ? "مکان انتخاب شد (برای تغییر مجدداً کلیک یا درگ کنید)" 
                : "برای ثبت موقعیت، روی نقشه کلیک کنید"}
            </span>
          </div>
        </div>

        {/* Map Float Actions (GPS, Recenter, Resize) */}
        <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleGpsLocation}
            disabled={gpsLoading}
            className="p-2.5 bg-white hover:bg-slate-50 text-indigo-600 rounded-xl shadow-lg border border-slate-200 transition-all cursor-pointer flex items-center justify-center group"
            title="دریافت مکان من با GPS"
          >
            <Locate className={`h-4 w-4 ${gpsLoading ? "animate-spin text-amber-500" : "group-hover:scale-110"}`} />
          </button>

          <button
            type="button"
            onClick={handleRecenterPark}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border border-slate-200 transition-all cursor-pointer flex items-center justify-center group"
            title="مرکز شهرک صنعتی"
          >
            <RotateCcw className="h-4 w-4 group-hover:-rotate-90 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border border-slate-200 transition-all cursor-pointer flex items-center justify-center"
            title={isExpanded ? "کوچک کردن نقشه" : "بزرگ کردن نقشه"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Zoom In / Zoom Out Controls */}
        <div className="absolute top-3 left-3 z-20 flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden pointer-events-auto">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 hover:bg-slate-50 text-slate-700 font-bold text-xs border-b border-slate-100 transition-colors"
            title="بزرگنمایی"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
            title="کوچک‌نمایی"
          >
            -
          </button>
        </div>
      </div>

      {/* Selected Coordinates & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs">
        {hasCoords ? (
          <div className="flex items-center gap-2 text-emerald-700 flex-wrap">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-bold">موقعیت ثبت شد:</span>
            <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-mono text-[11px] font-bold text-emerald-900">
              <span>عرض: {latitude?.toFixed(5)}</span>
              <span className="text-emerald-300">|</span>
              <span>طول: {longitude?.toFixed(5)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Info className="h-4 w-4 text-slate-400" />
            <span>هنوز نقطه‌ای روی نقشه نشان نشده است.</span>
          </div>
        )}

        <div className="flex items-center gap-2 mr-auto">
          {hasCoords && onGenerateMapUrl && (
            <button
              type="button"
              onClick={handleAutoFillLinks}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="ساخت خودکار لینک نقشه گوگل بر اساس این نقطه"
            >
              <Navigation className="h-3 w-3" />
              <span>ایجاد لینک هوشمند</span>
            </button>
          )}

          {hasCoords && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span>حذف نشان</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
