"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation";
import MapLoader from "../../components/MapLoader";
import { 
  Navigation as RouteIcon, ShieldCheck, MapPin, AlertCircle, Sparkles, 
  Send, Plus, CheckCircle, Map, Crosshair, Compass, ShieldAlert
} from "lucide-react";

export default function CitizenPage() {
  const [wards, setWards] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [activeCityId, setActiveCityId] = useState<string>("");
  const [activeCity, setActiveCity] = useState<any | null>(null);
  
  // Reporting state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [description, setDescription] = useState("");
  const [reportCoords, setReportCoords] = useState<[number, number] | null>(null);
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  // Routing state
  const [safeRoute, setSafeRoute] = useState<[number, number][] | undefined>(undefined);
  const [routeInfo, setRouteInfo] = useState<string | null>(null);
  const [routingActive, setRoutingActive] = useState(false);
  const [detoursAvoided, setDetoursAvoided] = useState<number>(0);

  const loadData = (targetCityId?: string) => {
    const cityIdToUse = targetCityId || activeCityId || localStorage.getItem("floodpulse_city") || "";
    if (!cityIdToUse) return;

    fetch(`/api/wards?cityId=${cityIdToUse}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWards(data);
      });

    fetch(`/api/incidents?cityId=${cityIdToUse}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setIncidents(data);
      });
  };

  useEffect(() => {
    const initialCityId = localStorage.getItem("floodpulse_city") || "";
    setActiveCityId(initialCityId);
    if (initialCityId) {
      loadData(initialCityId);
    }

    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveCityId(customEvent.detail);
        setSafeRoute(undefined);
        setRouteInfo(null);
        setRoutingActive(false);
        setReportCoords(null);
        setReportResult(null);
      }
    };
    window.addEventListener("cityChanged", handleCityChange);
    return () => window.removeEventListener("cityChanged", handleCityChange);
  }, []);

  useEffect(() => {
    if (!activeCityId) return;

    // Fetch active city stats
    fetch("/api/cities")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const matched = data.find(c => c.id === activeCityId);
          if (matched) setActiveCity(matched);
        }
      })
      .catch((err) => console.error("Error loading active city details:", err));

    loadData(activeCityId);
    const interval = setInterval(() => loadData(activeCityId), 10000);
    return () => clearInterval(interval);
  }, [activeCityId]);

  const handleMapClick = (lat: number, lng: number) => {
    if (showReportForm) {
      setReportCoords([lat, lng]);
    }
  };

  // Browser Geolocation Autofill
  const handleAutoGeolocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReportCoords([position.coords.latitude, position.coords.longitude]);
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        // Fallback to center of mock city for hackathon simplicity if GPS is denied
        if (activeCity) {
          setReportCoords([activeCity.latitude, activeCity.longitude]);
        } else {
          setReportCoords([18.93, 72.83]);
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportCoords) {
      alert("Please drop a pin on the map or click Locate Me.");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName,
          reporterPhone,
          description,
          latitude: reportCoords[0],
          longitude: reportCoords[1],
          cityId: activeCityId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setReportResult(data);
        setDescription("");
        setReporterName("");
        setReporterPhone("");
        setReportCoords(null);
        loadData();
      } else {
        alert(data.error || "Failed to submit report");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateRoute = async () => {
    let startLat = 18.932;
    let startLng = 72.827;
    let endLat = 18.948;
    let endLng = 72.834;

    if (activeCity && activeCity.name === "Bengaluru") {
      startLat = 12.972;
      startLng = 77.640;
      endLat = 12.928;
      endLng = 77.680;
    } else if (activeCity && activeCity.name === "Chennai") {
      startLat = 13.039;
      startLng = 80.231;
      endLat = 12.978;
      endLng = 80.225;
    }

    try {
      const res = await fetch(`/api/safe-route?cityId=${activeCityId}&startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`);
      const data = await res.json();
      if (res.ok) {
        setSafeRoute(data.path);
        setRouteInfo(data.message);
        setDetoursAvoided(data.criticalIncidentsAvoided || 0);
        setRoutingActive(true);
      }
    } catch (e) {
      console.error("Routing error:", e);
    }
  };

  const handleClearRoute = () => {
    setSafeRoute(undefined);
    setRouteInfo(null);
    setDetoursAvoided(0);
    setRoutingActive(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden relative">
        
        {/* Map visualizer */}
        <div className="lg:col-span-3 h-[calc(100vh-3.5rem)] relative">
          <MapLoader
            wards={wards}
            incidents={incidents}
            onMapClick={handleMapClick}
            reportCoordinates={reportCoords}
            safeRoutePath={safeRoute}
            cityCenter={activeCity ? [activeCity.latitude, activeCity.longitude] : undefined}
            cityZoom={activeCity ? activeCity.zoomLevel : undefined}
          />

          {!showReportForm && (
            <button
              onClick={() => {
                setShowReportForm(true);
                setReportResult(null);
              }}
              className="absolute top-4 right-4 z-[1000] bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 border border-emerald-400 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Report Local Hazard
            </button>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-900 bg-slate-950/60 backdrop-blur-md p-5 flex flex-col justify-between overflow-y-auto h-[calc(100vh-3.5rem)]">
          <div className="space-y-6">
            
            <div>
              <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                <Compass className="h-3.5 w-3.5" />
                Citizen Portal
              </span>
              <h2 className="text-xl font-bold mt-1 text-slate-100">Resilient Navigation</h2>
              <p className="text-xs text-slate-400 mt-1">
                Monitor local storm drains, file flood reports, and route safely around waterlogged streets.
              </p>
            </div>

            {/* Safe Detour Router */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <RouteIcon className="h-4 w-4 text-emerald-400" />
                Emergency Detour Planner
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Avoid active high-water hazards. Compute a low-risk transit path detour instantly.
              </p>

              {!routingActive ? (
                <button
                  onClick={handleSimulateRoute}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Map className="h-3.5 w-3.5" />
                  Simulate Safe Path (Downtown &rarr; Harbor)
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 p-3 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>Low-Risk Route Active</span>
                    </div>
                    <p className="text-slate-300 leading-normal">{routeInfo}</p>
                    {detoursAvoided > 0 && (
                      <span className="inline-block bg-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-800/30">
                        Bypassed {detoursAvoided} Critical Blockage
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleClearRoute}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Reset Route Overlay
                  </button>
                </div>
              )}
            </div>

            {/* Reporting Form Drawer */}
            {showReportForm && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    File Waterlogging Report
                  </h3>
                  <button
                    onClick={() => {
                      setShowReportForm(false);
                      setReportCoords(null);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                  >
                    Close
                  </button>
                </div>

                {reportResult ? (
                  /* Success Feedback */
                  <div className="space-y-3 py-1">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-bold text-xs">Report Logged Successfully!</span>
                    </div>
                    
                    {reportResult.severity === "CRITICAL" && (
                      <div className="bg-red-950/20 border border-red-900/40 text-red-400 p-2 rounded-lg text-[10px] flex items-start gap-1.5 font-semibold">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>Warning: AI classified this incident as critical hazard. Local emergency services have been dispatched.</span>
                      </div>
                    )}

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 space-y-1.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Zero-Shot Match:</span>
                        <strong className="text-slate-200 uppercase">{reportResult.aiLabel}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Model Confidence:</span>
                        <strong className="text-slate-200">{Math.round(reportResult.aiConfidence * 100)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ward Assessment:</span>
                        <strong className="text-slate-200">{reportResult.ward?.name || "Unassigned"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Report Status:</span>
                        <strong className="text-emerald-400">{reportResult.status}</strong>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setReportResult(null)}
                      className="w-full bg-slate-800 hover:bg-slate-700 py-1.5 text-slate-200 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      File Another Report
                    </button>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmitReport} className="space-y-3">
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleAutoGeolocate}
                        disabled={locating}
                        className="col-span-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Crosshair className={`h-3.5 w-3.5 text-emerald-400 ${locating ? "animate-spin" : ""}`} />
                        {locating ? "Accessing GPS..." : "Locate Me (Autofill)"}
                      </button>

                      <div className={`col-span-2 p-2.5 rounded-lg border text-center text-[10px] font-bold ${
                        reportCoords ? "bg-slate-950 border-slate-850 text-slate-300" : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 animate-pulse"
                      }`}>
                        <MapPin className="h-3.5 w-3.5 mx-auto mb-1 text-emerald-400" />
                        {reportCoords 
                          ? `Lat: ${reportCoords[0].toFixed(5)}, Lng: ${reportCoords[1].toFixed(5)}` 
                          : "CLICK ON MAP to set coordinates"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">
                        Describe waterlogging or drain issue *
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Grate is clogged with debris. Water pooling on road."
                        rows={3}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-450 font-bold uppercase mb-1">Your Name</label>
                        <input
                          type="text"
                          value={reporterName}
                          onChange={(e) => setReporterName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-455 font-bold uppercase mb-1">Mobile #</label>
                        <input
                          type="text"
                          value={reporterPhone}
                          onChange={(e) => setReporterPhone(e.target.value)}
                          placeholder="+15550000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      <span>Inference engine: Bart Zero-Shot classifier.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-850 disabled:text-slate-550 text-slate-950 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      {isSubmitting ? "Processing AI Analysis..." : "Submit Incident"}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>

          <div className="pt-4 border-t border-slate-900 text-[10px] text-slate-500 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span>In case of severe threat, dial emergency lines.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
