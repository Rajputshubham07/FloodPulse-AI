"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation";
import MapLoader from "../../components/MapLoader";
import { 
  Landmark, Users, Clock, AlertTriangle, CloudRain, Send, Settings2, 
  CheckCircle2, Filter, ArrowUpDown, ChevronRight, ShieldAlert, BarChart3, Bot
} from "lucide-react";
import MunicipalCopilot from "../../components/MunicipalCopilot";

export default function MunicipalPage() {
  const [wards, setWards] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [selectedWard, setSelectedWard] = useState<any | null>(null);
  const [activeCityId, setActiveCityId] = useState<string>("");

  // Filters & Sorting state
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterWard, setFilterWard] = useState("ALL");
  const [sortBy, setSortBy] = useState("PRIORITY"); // PRIORITY, RECENCY, AGE

  // Simulation controls
  const [simulatedRainfall, setSimulatedRainfall] = useState<number>(25);

  // Update controls
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [runningPrediction, setRunningPrediction] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const loadData = (rainfallVal?: number, targetCityId?: string) => {
    const cityIdToUse = targetCityId || activeCityId || localStorage.getItem("floodpulse_city") || "";
    if (!cityIdToUse) return;

    const baseWardsUrl = `/api/wards?cityId=${cityIdToUse}`;
    const url = rainfallVal !== undefined ? `${baseWardsUrl}&rainfall=${rainfallVal}` : baseWardsUrl;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWards(data);
          // Update selected ward reference if it exists
          if (selectedWard) {
            const updated = data.find(w => w.id === selectedWard.id);
            if (updated) setSelectedWard(updated);
          }
        }
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
      loadData(undefined, initialCityId);
    }

    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveCityId(customEvent.detail);
        setSelectedIncident(null);
        setSelectedWard(null);
      }
    };
    window.addEventListener("cityChanged", handleCityChange);
    return () => window.removeEventListener("cityChanged", handleCityChange);
  }, []);

  useEffect(() => {
    if (!activeCityId) return;
    loadData(undefined, activeCityId);
    const interval = setInterval(() => loadData(undefined, activeCityId), 10000);
    return () => clearInterval(interval);
  }, [activeCityId]);

  useEffect(() => {
    if (selectedIncident) {
      setAssignedTo(selectedIncident.assignedTo || "");
      setStatus(selectedIncident.status || "REPORTED");
      setSeverity(selectedIncident.severity || "LOW");
      
      // Auto select ward if incident is selected
      if (selectedIncident.wardId) {
        const linkedWard = wards.find(w => w.id === selectedIncident.wardId);
        if (linkedWard) setSelectedWard(linkedWard);
      }
    }
  }, [selectedIncident, wards]);

  const handleRainfallChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSimulatedRainfall(val);
    loadData(val);
  };

  const handleTriggerAI = async () => {
    setRunningPrediction(true);
    try {
      const res = await fetch("/api/predictions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId: activeCityId })
      });
      if (res.ok) {
        alert("AI Flood Forecast updated successfully using Open-Meteo forecasts!");
        loadData();
      } else {
        alert("Failed to run prediction engine.");
      }
    } catch (e) {
      console.error(e);
      alert("Error executing AI forecast model.");
    } finally {
      setRunningPrediction(false);
    }
  };

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTo: assignedTo || null,
          status,
          severity
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedIncident(data);
        loadData();
      } else {
        alert(data.error || "Failed to update action");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating report");
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper to map severity weights for priority queue
  const getSeverityWeight = (sev: string) => {
    switch (sev) {
      case "CRITICAL": return 4;
      case "HIGH": return 3;
      case "MEDIUM": return 2;
      default: return 1;
    }
  };

  // Apply filters
  const filteredIncidents = incidents.filter(inc => {
    const matchesSeverity = filterSeverity === "ALL" || inc.severity === filterSeverity;
    const matchesWard = filterWard === "ALL" || inc.wardId === filterWard;
    return matchesSeverity && matchesWard;
  });

  // Apply sorting
  const sortedIncidents = [...filteredIncidents].sort((a, b) => {
    if (sortBy === "PRIORITY") {
      const diff = getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // secondary sort recency
    } else if (sortBy === "RECENCY") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // AGE (oldest unresolved first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

  // Incident status index for timeline tracker
  const getStatusStepIndex = (s: string) => {
    switch (s) {
      case "REPORTED": return 0;
      case "INVESTIGATING": return 1;
      case "DISPATCHED": return 2;
      case "RESOLVED": return 3;
      default: return 0;
    }
  };

  const statusSteps = [
    { title: "Reported", desc: "Citizen filed" },
    { title: "Investigating", desc: "Muni inspected" },
    { title: "Dispatched", desc: "Crew on site" },
    { title: "Resolved", desc: "Drainage cleared" }
  ];

  const activeReportsCount = incidents.filter(i => i.status !== "RESOLVED").length;
  const criticalHotspotsCount = incidents.filter(i => i.status !== "RESOLVED" && i.severity === "CRITICAL").length;
  const criticalWardsCount = wards.filter(w => w.riskLevel === "CRITICAL" || w.riskLevel === "HIGH").length;

  // Get prediction data for Top 5 Risk Wards (based on 6h window)
  const highRiskWards = wards
    .map(w => {
      const pred = w.predictions?.find((p: any) => p.predictionWindow === "6h");
      return {
        id: w.id,
        name: w.name.split(":")[0],
        probability: pred ? pred.probability : 0,
        severity: pred ? pred.severity : "LOW",
        reasoning: pred ? pred.reasoning : "No current threat."
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  const predictiveCriticalCount = wards.filter(w => {
    const p = w.predictions?.find((p: any) => p.predictionWindow === "6h");
    return p && p.probability > 70;
  }).length;

  const resourcePumps = predictiveCriticalCount * 2;
  const resourceSandbags = predictiveCriticalCount * 250;
  const resourceCrews = Math.ceil(predictiveCriticalCount * 1.5);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
        
        {/* Left Side: Operations Queue */}
        <div className="lg:col-span-1 border-r border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                <Landmark className="h-3 w-3" />
                Urban Response Center
              </span>
              <h2 className="text-lg font-bold mt-1 text-slate-100">Hotspot Dispatch Queue</h2>
            </div>

            {/* Storm Simulator */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-900 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <CloudRain className="h-3.5 w-3.5 text-teal-400" />
                  Storm Intensity Simulator
                </span>
                <span className="font-semibold text-teal-400">{simulatedRainfall} mm/hr</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={simulatedRainfall}
                onChange={handleRainfallChange}
                className="w-full accent-teal-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                <span>0 mm/hr</span>
                <span>40 mm/hr</span>
                <span>80 mm/hr</span>
              </div>
            </div>

            {/* Queue Filters and Sorting */}
            <div className="bg-slate-900/20 border border-slate-900 p-2.5 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Filter className="h-2.5 w-2.5" /> Severity
                  </label>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-[10px] rounded p-1 text-slate-300 focus:outline-none"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <ArrowUpDown className="h-2.5 w-2.5" /> Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-[10px] rounded p-1 text-slate-300 focus:outline-none"
                  >
                    <option value="PRIORITY">Priority Queue</option>
                    <option value="RECENCY">Newest Reports</option>
                    <option value="AGE">Oldest Pending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Queue List */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Dispatch Queue ({sortedIncidents.filter(i => i.status !== "RESOLVED").length})
              </span>

              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                {sortedIncidents.filter(i => i.status !== "RESOLVED").length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-900 rounded-lg">
                    <p className="text-xs text-slate-600">No active incidents match filters.</p>
                  </div>
                ) : (
                  sortedIncidents
                    .filter(i => i.status !== "RESOLVED")
                    .map((inc) => (
                      <button
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                          selectedIncident?.id === inc.id
                            ? "bg-slate-900 border-teal-500/80 shadow-md"
                            : "bg-slate-900/20 border-slate-900/50 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            inc.severity === "CRITICAL" ? "bg-red-950/40 text-red-400 border border-red-900/30" :
                            inc.severity === "HIGH" ? "bg-orange-950/40 text-orange-400 border border-orange-900/30" :
                            "bg-yellow-950/40 text-yellow-400 border border-yellow-900/30"
                          }`}>
                            {inc.severity}
                          </span>
                          <span className="text-[9px] font-bold uppercase text-slate-500">{inc.status}</span>
                        </div>
                        <p className="font-semibold text-slate-200 line-clamp-1">{inc.description}</p>
                        <div className="flex justify-between text-[9px] text-slate-500 border-t border-slate-800/40 pt-1.5 mt-0.5">
                          <span className="truncate max-w-[100px]">{inc.ward?.name || "Unassigned"}</span>
                          <span>{new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>

          </div>
          <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center">
            MCGM South Mumbai Command Center
          </div>
        </div>

        {/* Center Panel: Map & AI Prediction Analytics (2 Cols) */}
        <div className="lg:col-span-2 h-[calc(100vh-3.5rem)] flex flex-col overflow-y-auto">
          {/* Map Section */}
          <div className="h-[55%] min-h-[360px] relative border-b border-slate-900">
            <MapLoader
              wards={wards}
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </div>

          {/* AI Predictive Intelligence Section */}
          <div className="h-[45%] bg-slate-950 p-4 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
              <div>
                <span className="text-[9px] text-blue-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <CloudRain className="h-3 w-3" /> Predictive Forecast Dashboard
                </span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">AI Flood Risk Analysis & Resource Planning</h3>
              </div>
              <button
                onClick={handleTriggerAI}
                disabled={runningPrediction}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-900/10"
              >
                {runningPrediction ? "Running AI Models..." : "Trigger AI Predictions"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top High-Risk Wards (6h Forecast) */}
              <div className="bg-slate-900/30 border border-slate-900/80 rounded-xl p-3.5 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top 5 Wards at Flood Risk (6h Forecast)</h4>
                <div className="space-y-2.5">
                  {highRiskWards.length === 0 ? (
                    <p className="text-[11px] text-slate-500">No predictions generated. Click trigger predictions.</p>
                  ) : (
                    highRiskWards.map((w, idx) => (
                      <div key={w.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{idx + 1}. {w.name}</span>
                          <span className={`text-[10px] font-bold ${
                            w.severity === "CRITICAL" ? "text-red-400" :
                            w.severity === "HIGH" ? "text-orange-400" :
                            "text-yellow-400"
                          }`}>{w.probability}% ({w.severity})</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              w.severity === "CRITICAL" ? "bg-red-500" :
                              w.severity === "HIGH" ? "bg-orange-500" :
                              "bg-yellow-500"
                            }`}
                            style={{ width: `${w.probability}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Resource Planning Panel */}
              <div className="bg-slate-900/30 border border-slate-900/80 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Emergency Resource Pre-Planning</h4>
                  <p className="text-[11px] text-slate-400 leading-normal mb-3">
                    Calculated logistical mobilization based on wards forecasting above **70%** probability:
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <span className="block text-lg font-black text-blue-400">{resourcePumps}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Pumps Reqd</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <span className="block text-lg font-black text-amber-400">{resourceSandbags}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Sandbags</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <span className="block text-lg font-black text-emerald-400">{resourceCrews}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Squads</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-900/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Target Readiness:</span>
                  <span className="font-extrabold text-slate-200">
                    {predictiveCriticalCount > 0 ? "Mobilize Instantly" : "Normal Standby"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Command Center Details */}
        <div className="lg:col-span-1 border-l border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-5">
            
            {/* Quick KPI stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/40 border border-slate-900 p-2 rounded-xl text-center">
                <Clock className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                <span className="block text-sm font-extrabold text-slate-200">{activeReportsCount}</span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Unresolved</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-900 p-2 rounded-xl text-center">
                <ShieldAlert className="h-4 w-4 text-red-400 mx-auto mb-1 animate-pulse" />
                <span className="block text-sm font-extrabold text-slate-200">{criticalHotspotsCount}</span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Hotspots</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-900 p-2 rounded-xl text-center">
                <BarChart3 className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <span className="block text-sm font-extrabold text-slate-200">{criticalWardsCount}</span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">At Risk Wards</span>
              </div>
            </div>

            {/* Explainable Ward Risk Box */}
            {selectedWard && (
              <div className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Ward Status</span>
                  <span className="text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                    Readiness: {selectedWard.readinessScore}%
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-200">{selectedWard.name}</h4>
                
                {/* Score indicators */}
                <div className="space-y-1.5 pt-1 text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Precipitation risk:</span>
                    <strong className="text-slate-200">{selectedWard.breakdown?.rainfall || "N/A"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Elevation safety:</span>
                    <strong className="text-slate-200">{selectedWard.breakdown?.elevation || "N/A"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Active blockages:</span>
                    <strong className="text-slate-200">{selectedWard.breakdown?.blockages || "N/A"}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Incident Operations */}
            {selectedIncident ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Settings2 className="h-4 w-4 text-teal-400" />
                    Incident Dispatch Command
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  
                  {/* Status Timeline */}
                  <div className="relative pl-3 border-l border-slate-800/80 space-y-4">
                    {statusSteps.map((step, idx) => {
                      const isActive = getStatusStepIndex(status) >= idx;
                      return (
                        <div key={idx} className="relative flex items-start gap-2.5">
                          <div className={`absolute -left-[17px] top-1.5 w-2 h-2 rounded-full border transition-all ${
                            isActive 
                              ? "bg-teal-400 border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.6)] animate-pulse" 
                              : "bg-slate-950 border-slate-700"
                          }`} />
                          <div>
                            <p className={`font-bold text-[10px] tracking-wide uppercase ${isActive ? "text-teal-400" : "text-slate-500"}`}>
                              {step.title}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Metadata Tags */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 text-[10px] text-slate-500 space-y-1.5">
                    <p className="text-slate-300 italic">"{selectedIncident.description}"</p>
                    <div className="pt-2 border-t border-slate-900 flex justify-between">
                      <span>AI Classification:</span>
                      <strong className="text-teal-400 font-bold uppercase">{selectedIncident.aiLabel}</strong>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateIncident} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Update Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        <option value="REPORTED">REPORTED (Queue Entry)</option>
                        <option value="INVESTIGATING">INVESTIGATING (Inspection)</option>
                        <option value="DISPATCHED">DISPATCHED (Agency Dispatched)</option>
                        <option value="RESOLVED">RESOLVED (Complete)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Assign Response Agency</label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="e.g. Rapid Drainage Squad C"
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Adjust Severity</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        <option value="LOW">LOW Risk</option>
                        <option value="MEDIUM">MEDIUM Risk</option>
                        <option value="HIGH">HIGH Risk</option>
                        <option value="CRITICAL">CRITICAL Hazard</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Send className="h-3 w-3" />
                      {isUpdating ? "Saving changes..." : "Dispatch & Save Operations"}
                    </button>
                  </form>

                </div>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-900 rounded-xl bg-slate-900/10">
                <Clock className="h-5 w-5 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Select an incident from the list or map to coordinate dispatch operations.</p>
              </div>
            )}

          </div>

          <div className="pt-2 border-t border-slate-900 flex justify-between text-[10px] text-slate-600 font-semibold">
            <span>Operator: Elena Rostova</span>
            <span>v1.0.0</span>
          </div>
        </div>

      </div>

      {/* Floating AI Copilot Toggle Button */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-[2500] bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold p-3.5 rounded-full shadow-xl shadow-indigo-950/40 flex items-center justify-center cursor-pointer border border-indigo-400/30 transition-transform active:scale-95 animate-bounce hover:animate-none"
      >
        <Bot className="h-6 w-6" />
      </button>

      <MunicipalCopilot
        cityId={activeCityId}
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
}
