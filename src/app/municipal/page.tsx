"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation";
import MapLoader from "../../components/MapLoader";
import { Landmark, Users, Clock, AlertTriangle, CloudRain, Send, Settings2, CheckCircle2 } from "lucide-react";

export default function MunicipalPage() {
  const [wards, setWards] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  // Simulation controls
  const [simulatedRainfall, setSimulatedRainfall] = useState<number>(25);

  // Update controls
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = (rainfallVal?: number) => {
    // If rainfall value is provided, fetch with it to simulate risk changes
    const url = rainfallVal !== undefined ? `/api/wards?rainfall=${rainfallVal}` : "/api/wards";
    fetch(url)
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
    const interval = setInterval(() => loadData(undefined), 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedIncident) {
      setAssignedTo(selectedIncident.assignedTo || "");
      setStatus(selectedIncident.status || "REPORTED");
      setSeverity(selectedIncident.severity || "LOW");
    }
  }, [selectedIncident]);

  // Handle slide change to simulate heavy storms
  const handleRainfallChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSimulatedRainfall(val);
    loadData(val); // triggers DB score update for all wards
  };

  // Submit incident actions (assignment and status updates)
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
        // Refresh everything
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

  // Compute stat metrics
  const activeReportsCount = incidents.filter(i => i.status !== "RESOLVED").length;
  const criticalHotspotsCount = incidents.filter(i => i.status !== "RESOLVED" && i.severity === "CRITICAL").length;
  const criticalWardsCount = wards.filter(w => w.riskLevel === "CRITICAL" || w.riskLevel === "HIGH").length;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
        
        {/* Left Hand: Incidents List & Controls (1 Col) */}
        <div className="lg:col-span-1 border-r border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-widest">
                Municipal Panel
              </span>
              <h2 className="text-lg font-bold mt-1 text-slate-100">Urban Response Center</h2>
              <p className="text-xs text-slate-400 mt-1">
                Monitor ward performance, allocate emergency crew resources, and resolve drainage bottlenecks.
              </p>
            </div>

            {/* Rainfall Simulation Slider */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <CloudRain className="h-4 w-4 text-teal-400" />
                  Simulate Rainfall
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
                className="w-full accent-teal-400 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Dry (0)</span>
                <span>Moderate (25)</span>
                <span>Heavy (50)</span>
                <span>Extreme (80)</span>
              </div>
            </div>

            {/* Incident List */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Reports ({activeReportsCount})
                </h3>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {incidents.filter(i => i.status !== "RESOLVED").length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-600">No active incidents reported.</p>
                  </div>
                ) : (
                  incidents
                    .filter(i => i.status !== "RESOLVED")
                    .map((inc) => (
                      <button
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                          selectedIncident?.id === inc.id
                            ? "bg-slate-900 border-teal-500 shadow-md"
                            : "bg-slate-900/30 border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            inc.severity === "CRITICAL"
                              ? "bg-red-950/40 text-red-400"
                              : inc.severity === "HIGH"
                              ? "bg-orange-950/40 text-orange-400"
                              : "bg-yellow-950/40 text-yellow-400"
                          }`}>
                            {inc.severity}
                          </span>
                          <span className="text-[10px] text-slate-500">{inc.status}</span>
                        </div>
                        <p className="font-semibold text-slate-200 line-clamp-1">{inc.description}</p>
                        <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-800/40 pt-1.5 mt-0.5">
                          <span>{inc.ward?.name || "Unassigned Ward"}</span>
                          <span>{new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-900 text-[10px] text-slate-500">
            System logged database: sqlite://dev.db
          </div>
        </div>

        {/* Center: Map visualizer (2 Cols) */}
        <div className="lg:col-span-2 h-[calc(100vh-3.5rem)] relative">
          <MapLoader
            wards={wards}
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={setSelectedIncident}
          />
        </div>

        {/* Right Hand: Action Detail & Metrics (1 Col) */}
        <div className="lg:col-span-1 border-l border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-6">
            
            {/* Quick Analytics Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/30 border border-slate-800 p-2.5 rounded-xl text-center">
                <Users className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                <span className="block text-md font-extrabold text-slate-100">{activeReportsCount}</span>
                <span className="text-[9px] text-slate-500">Reports</span>
              </div>
              <div className="bg-slate-900/30 border border-slate-800 p-2.5 rounded-xl text-center">
                <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1" />
                <span className="block text-md font-extrabold text-slate-100">{criticalHotspotsCount}</span>
                <span className="text-[9px] text-slate-500">Hotspots</span>
              </div>
              <div className="bg-slate-900/30 border border-slate-800 p-2.5 rounded-xl text-center">
                <Landmark className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <span className="block text-md font-extrabold text-slate-100">{criticalWardsCount}</span>
                <span className="text-[9px] text-slate-500">At-Risk Wards</span>
              </div>
            </div>

            {/* Selected Incident Actions */}
            {selectedIncident ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Settings2 className="h-4 w-4 text-teal-400" />
                    Incident Details & Actions
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Coordinate response and adjust severity metrics.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 space-y-2">
                    <p className="text-slate-200 leading-normal font-semibold">"{selectedIncident.description}"</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                      <div>
                        <span>Reporter: </span>
                        <strong className="text-slate-400">{selectedIncident.reporterName || "Anonymous"}</strong>
                      </div>
                      <div>
                        <span>Phone: </span>
                        <strong className="text-slate-400">{selectedIncident.reporterPhone || "N/A"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* AI Prediction metadata */}
                  <div className="flex items-center gap-1 text-[10px] bg-teal-950/20 border border-teal-900/40 text-teal-300 p-2 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>AI Tagged: <strong>{selectedIncident.aiLabel}</strong> ({Math.round(selectedIncident.aiConfidence * 100)}%)</span>
                  </div>

                  {/* Update Form */}
                  <form onSubmit={handleUpdateIncident} className="space-y-3.5 pt-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                        Response Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        <option value="REPORTED">REPORTED (New)</option>
                        <option value="INVESTIGATING">INVESTIGATING (Inspection)</option>
                        <option value="DISPATCHED">DISPATCHED (Crew Sent)</option>
                        <option value="RESOLVED">RESOLVED (Cleared)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                        Assigned Agency / Officer
                      </label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="e.g. Rapid Drainage Squad C"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">
                        Override Severity
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      >
                        <option value="LOW">LOW Risk</option>
                        <option value="MEDIUM">MEDIUM Risk</option>
                        <option value="HIGH">HIGH Risk</option>
                        <option value="CRITICAL">CRITICAL Danger</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Send className="h-3 w-3" />
                      {isUpdating ? "Saving changes..." : "Dispatch & Save Action"}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
                <Clock className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Select an incident from the map or listing to initiate response operations.</p>
              </div>
            )}

          </div>

          <div className="pt-4 border-t border-slate-900 flex justify-between text-[10px] text-slate-500">
            <span>Official Login: Elena Rostova</span>
            <button className="hover:text-slate-300">Sign Out</button>
          </div>
        </div>

      </div>
    </div>
  );
}
