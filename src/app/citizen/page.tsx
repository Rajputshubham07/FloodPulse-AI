"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation";
import MapLoader from "../../components/MapLoader";
import { Navigation as RouteIcon, ShieldCheck, MapPin, AlertCircle, Sparkles, Send, Plus, CheckCircle, Map } from "lucide-react";

export default function CitizenPage() {
  const [wards, setWards] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  
  // Reporting state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [description, setDescription] = useState("");
  const [reportCoords, setReportCoords] = useState<[number, number] | null>(null);
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Routing state
  const [safeRoute, setSafeRoute] = useState<[number, number][] | undefined>(undefined);
  const [routeInfo, setRouteInfo] = useState<string | null>(null);
  const [routingActive, setRoutingActive] = useState(false);

  // Load wards and incidents
  const loadData = () => {
    fetch("/api/wards")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWards(data);
      });

    fetch("/api/incidents")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setIncidents(data);
      });
  };

  useEffect(() => {
    loadData();
    // Poll for changes every 10 seconds to look alive
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle map click to pin coordinates
  const handleMapClick = (lat: number, lng: number) => {
    if (showReportForm) {
      setReportCoords([lat, lng]);
    }
  };

  // Submit incident report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportCoords) {
      alert("Please click on the map to set your report coordinates.");
      return;
    }
    if (!description.trim()) {
      alert("Please provide a description of the issue.");
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
          longitude: reportCoords[1]
        })
      });

      const data = await res.json();
      if (res.ok) {
        setReportResult(data);
        setDescription("");
        setReporterName("");
        setReporterPhone("");
        setReportCoords(null);
        loadData(); // reload map points
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

  // Simulate routing
  const handleSimulateRoute = async () => {
    // Boston coordinates simulation: from Downtown Core (42.358, -71.061) to Riverfront East (42.353, -71.042)
    const startLat = 42.358;
    const startLng = -71.061;
    const endLat = 42.353;
    const endLng = -71.042;

    try {
      const res = await fetch(`/api/safe-route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`);
      const data = await res.json();
      if (res.ok) {
        setSafeRoute(data.path);
        setRouteInfo(data.message);
        setRoutingActive(true);
      }
    } catch (e) {
      console.error("Routing error:", e);
    }
  };

  const handleClearRoute = () => {
    setSafeRoute(undefined);
    setRouteInfo(null);
    setRoutingActive(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      {/* Main Map + UI grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden relative">
        
        {/* Map Panel (takes full width, or 3 cols) */}
        <div className="lg:col-span-3 h-[calc(100vh-3.5rem)] relative">
          <MapLoader
            wards={wards}
            incidents={incidents}
            onMapClick={handleMapClick}
            reportCoordinates={reportCoords}
            safeRoutePath={safeRoute}
          />

          {/* Floating Action Button (FAB) on mobile maps */}
          {!showReportForm && (
            <button
              onClick={() => {
                setShowReportForm(true);
                setReportResult(null);
              }}
              className="absolute top-4 right-4 z-[1000] bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 border border-emerald-400 transition-all pointer-events-auto"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Report Flood/Drain Issue
            </button>
          )}
        </div>

        {/* Sidebar Panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-slate-900 bg-slate-950/60 backdrop-blur-md p-5 flex flex-col justify-between overflow-y-auto h-[calc(100vh-3.5rem)]">
          <div className="space-y-6">
            
            {/* Standard Header */}
            <div>
              <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">
                Citizen Portal
              </span>
              <h2 className="text-xl font-bold mt-1 text-slate-100">Hyperlocal Safety</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Check neighborhood water levels, report street flooding, and navigate low-risk paths.
              </p>
            </div>

            {/* Dynamic Routing widget */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <RouteIcon className="h-4 w-4 text-emerald-400" />
                Resilient Route Planner
              </h3>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Calculate an intelligent route that shifts around reported flooded roads.
              </p>

              {!routingActive ? (
                <button
                  onClick={handleSimulateRoute}
                  className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Map className="h-3.5 w-3.5" />
                  Simulate Commute (Avoiding Flood)
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="text-[11px] bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 p-2.5 rounded-lg flex items-start gap-1.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{routeInfo}</span>
                  </div>
                  <button
                    onClick={handleClearRoute}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all"
                  >
                    Clear Route Overlay
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
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    Close
                  </button>
                </div>

                {reportResult ? (
                  // Success State
                  <div className="space-y-3 py-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-bold text-xs">Report Filed Successfully!</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Auto Classification:</span>
                        <strong className="text-slate-200">{reportResult.aiLabel}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">AI Confidence:</span>
                        <strong className="text-slate-200">{Math.round(reportResult.aiConfidence * 100)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Priority Level:</span>
                        <strong className="text-red-400">{reportResult.severity}</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Thank you. Your report has been geo-coded and routed to the municipal engineering pipeline.
                    </p>
                    <button
                      onClick={() => setReportResult(null)}
                      className="w-full bg-slate-800 hover:bg-slate-700 py-1.5 text-slate-200 rounded text-[11px] font-semibold"
                    >
                      File Another Report
                    </button>
                  </div>
                ) : (
                  // Active Form
                  <form onSubmit={handleSubmitReport} className="space-y-3.5">
                    {/* Location picker prompt */}
                    <div className={`p-2.5 rounded-lg border text-center transition-all ${
                      reportCoords 
                        ? "bg-slate-950/80 border-slate-800 text-slate-300" 
                        : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 animate-pulse"
                    }`}>
                      <MapPin className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
                      <p className="text-[10px] font-semibold">
                        {reportCoords 
                          ? `Location Pinned: ${reportCoords[0].toFixed(5)}, ${reportCoords[1].toFixed(5)}` 
                          : "CLICK ON MAP to drop incident pin"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                        Describe waterlogging or drain issue *
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Clogged sewer grates with plastic waste, water reaching sidewalk level."
                        rows={3}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Your Name</label>
                        <input
                          type="text"
                          value={reporterName}
                          onChange={(e) => setReporterName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Mobile #</label>
                        <input
                          type="text"
                          value={reporterPhone}
                          onChange={(e) => setReporterPhone(e.target.value)}
                          placeholder="+15550000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* AI Tag indicator */}
                    <div className="text-[9px] text-slate-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      <span>FloodPulse AI will automatically categorize your photo and description.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <Send className="h-3 w-3" />
                      {isSubmitting ? "Uploading & Analysing..." : "Submit Incident Report"}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Quick instructions */}
          <div className="pt-4 border-t border-slate-900 text-[10px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span>In case of severe threat to life, dial emergency services immediately.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
