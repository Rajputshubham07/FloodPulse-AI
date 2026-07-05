"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ShieldAlert, Send, FileSpreadsheet, Waves, Users, CheckCircle, AlertTriangle, Radio } from "lucide-react";

export default function DisasterPage() {
  const [wards, setWards] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Alert broadcast form state
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("WARNING");
  const [targetWardId, setTargetWardId] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

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

    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) {
      alert("Please fill out both the title and message fields.");
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: alertTitle,
          message: alertMessage,
          severity: alertSeverity,
          wardId: targetWardId || null
        })
      });

      if (res.ok) {
        setAlertTitle("");
        setAlertMessage("");
        setTargetWardId("");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to broadcast alert");
      }
    } catch (e) {
      console.error(e);
      alert("Error broadcasting alert");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (incidents.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["ID", "Reporter Name", "Reporter Phone", "Latitude", "Longitude", "Description", "AI Label", "AI Confidence", "Severity", "Status", "Ward", "Created At"];
    const rows = incidents.map(inc => [
      inc.id,
      inc.reporterName || "Anonymous",
      inc.reporterPhone || "N/A",
      inc.latitude,
      inc.longitude,
      `"${inc.description.replace(/"/g, '""')}"`,
      inc.aiLabel,
      inc.aiConfidence,
      inc.severity,
      inc.status,
      inc.ward?.name || "Unassigned",
      new Date(inc.createdAt).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FloodPulse_Incidents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recharts color mapper
  const getRiskColor = (score: number) => {
    if (score > 80) return "#ef4444"; // Red
    if (score > 60) return "#f97316"; // Orange
    if (score > 30) return "#eab308"; // Yellow
    return "#22c55e"; // Green
  };

  // Chart Data preparation
  const chartData = wards.map(w => ({
    name: w.name.split(":")[0], // Short name e.g. "Ward A"
    score: w.riskScore,
    color: getRiskColor(w.riskScore)
  }));

  // Aggregated incident totals
  const totalReports = incidents.length;
  const criticalReports = incidents.filter(i => i.severity === "CRITICAL" && i.status !== "RESOLVED").length;
  const resolvedReports = incidents.filter(i => i.status === "RESOLVED").length;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-4">
          <div>
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">
              Disaster Management Command
            </span>
            <h1 className="text-2xl font-bold mt-1 text-slate-100">City Emergency Overview</h1>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Incidents CSV
          </button>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-950/40 border border-blue-900 flex items-center justify-center text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Reports</span>
              <span className="text-xl font-extrabold text-slate-200">{totalReports}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-red-950/40 border border-red-900 flex items-center justify-center text-red-400">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Critical</span>
              <span className="text-xl font-extrabold text-slate-200">{criticalReports}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-950/40 border border-emerald-900 flex items-center justify-center text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Resolved Reports</span>
              <span className="text-xl font-extrabold text-slate-200">{resolvedReports}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-950/40 border border-amber-900 flex items-center justify-center text-amber-400">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Ward Risk</span>
              <span className="text-xl font-extrabold text-slate-200">
                {(wards.reduce((acc, curr) => acc + curr.riskScore, 0) / (wards.length || 1)).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Analytics & Warning Control Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Risk Level Chart (2 Cols on lg) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/40 border border-slate-900 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Geospatial Ward Risk Scores
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Visualizing dynamic flood threat metrics per neighborhood.
              </p>
            </div>
            
            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                  Loading ward metrics...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(51, 65, 85, 0.5)", borderRadius: "8px", fontSize: "11px" }}
                      labelClassName="font-bold text-slate-200"
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Alert Broadcasting Module (1 Col) */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                  Warning Broadcaster
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Publish emergency warnings directly to citizen header banners.
                </p>
              </div>

              <form onSubmit={handleBroadcastAlert} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Alert Title</label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder="e.g. Flash Flood Emergency"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Severity Category</label>
                  <select
                    value={alertSeverity}
                    onChange={(e) => setAlertSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="INFO">INFO (Update)</option>
                    <option value="WARNING">WARNING (Watch)</option>
                    <option value="DANGER">DANGER (Immediate Action)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Ward Location</label>
                  <select
                    value={targetWardId}
                    onChange={(e) => setTargetWardId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="">Broadcast Citywide (All Wards)</option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Warning Message</label>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="e.g. Avoid low-lying highways in Ward B. High risk of vehicle hydroplaning."
                    rows={3}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  {isBroadcasting ? "Broadcasting Alert..." : "Broadcast Immediate Warning"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Live Active Warnings list */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-900 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Alert Transmission History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-600">No warnings transmitted yet.</p>
            ) : (
              alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-xl border flex gap-3 text-xs ${
                    alert.severity === "DANGER" 
                      ? "bg-red-950/20 border-red-900/40" 
                      : "bg-amber-950/20 border-amber-900/40"
                  }`}
                >
                  <Radio className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${alert.severity === "DANGER" ? "text-red-400 animate-pulse" : "text-amber-400"}`} />
                  <div>
                    <h4 className="font-bold text-slate-200">{alert.title}</h4>
                    <p className="text-slate-400 mt-1 leading-relaxed">{alert.message}</p>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-800/40 pt-1.5">
                      <span>Severity: {alert.severity}</span>
                      <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-[10px] text-slate-600 bg-slate-950/10">
        MCGM & NDRF Maharashtra Command Panel. Authorized MCGM officials only.
      </footer>
    </div>
  );
}
