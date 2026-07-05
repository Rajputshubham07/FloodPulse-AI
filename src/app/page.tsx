"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Waves, ArrowRight, User, Landmark, ShieldAlert, BarChart3, Database, ShieldCheck, Zap, Activity } from "lucide-react";

export default function LandingPage() {
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/cities")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch((err) => console.error("Error loading cities:", err));
  }, []);

  const handleSelectCity = (cityId: string) => {
    localStorage.setItem("floodpulse_city", cityId);
    window.dispatchEvent(new CustomEvent("cityChanged", { detail: cityId }));
  };

  // Static roadmap cities
  const pipelineCities = [
    { name: "Delhi", region: "North", issue: "Yamuna river runoff & storm drain silt" },
    { name: "Hyderabad", region: "South", issue: "Lakes encroachment & flash waterlog" },
    { name: "Kolkata", region: "East", issue: "Hooghly tides & sewage lockouts" },
    { name: "Pune", region: "West", issue: "Mutha river spillover & concrete runoffs" }
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Brand Header */}
      <header className="border-b border-slate-900 bg-slate-950/40 backdrop-blur-md relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950">
                <Waves className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <span className="text-md font-bold tracking-tight bg-gradient-to-r from-blue-400 via-slate-100 to-emerald-400 bg-clip-text text-transparent">
              FloodPulse AI
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold border border-slate-800 px-3 py-1 rounded bg-slate-900/60 uppercase tracking-wider">
            National Smart-City Portal
          </div>
        </div>
      </header>

      {/* Hero Header Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10 flex flex-col items-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-950/30 text-emerald-400 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Pan-India Urban Flood Exchange
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-4xl text-slate-100 leading-[1.1] mx-auto">
            National Urban Flood & Drainage{" "}
            <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Risk Intelligence Exchange
            </span>
          </h1>

          <p className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed mx-auto">
            Aggregating hyperlocal smart-city metrics, dynamic rainfall simulations, and zero-shot AI citizen reporting channels across major Indian municipalities to mitigate storm hazards.
          </p>
        </div>

        {/* 1. National Pilot City Exchange Overview */}
        <div className="w-full mt-12 max-w-5xl">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Active Pilot Cities comparison index
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cities.map((city) => (
              <div 
                key={city.id}
                className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/60 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{city.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      city.riskLevel === "CRITICAL" ? "bg-red-950/40 text-red-400 border border-red-900/30" :
                      city.riskLevel === "HIGH" ? "bg-orange-950/40 text-orange-400 border border-orange-900/30" :
                      "bg-yellow-950/40 text-yellow-400 border border-yellow-900/30"
                    }`}>
                      {city.riskLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed h-12 overflow-hidden text-ellipsis">
                    {city.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-900 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Risk Score</span>
                      <span className="text-sm font-bold text-slate-100">{city.riskScore}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Readiness</span>
                      <span className="text-sm font-bold text-slate-100">{city.readinessScore}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Incidents</span>
                      <span className="text-sm font-bold text-emerald-400">{city.activeIncidentsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-2">
                  <Link 
                    href="/citizen"
                    onClick={() => handleSelectCity(city.id)}
                    className="w-full flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 rounded-lg font-bold transition-all"
                  >
                    Select & Drill Down &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Operations Modules Routing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12 max-w-5xl">
          <Link href="/citizen" className="group text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] flex flex-col justify-between h-56">
            <div>
              <div className="h-9 w-9 rounded-lg bg-blue-950/80 border border-blue-800/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <User className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold mt-4 text-slate-100 flex items-center gap-1.5">
                Citizen Portal
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Report local stormwater overflows or gridlocks, and generate rerouted safe navigation coordinates avoiding deep waterlogging.
              </p>
            </div>
            <div className="text-[9px] text-blue-400 font-bold tracking-wider uppercase">
              Open Citizen App &rarr;
            </div>
          </Link>

          <Link href="/municipal" className="group text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-teal-500/50 hover:bg-slate-900/80 transition-all hover:shadow-[0_0_20px_rgba(20,184,166,0.1)] flex flex-col justify-between h-56">
            <div>
              <div className="h-9 w-9 rounded-lg bg-teal-950/80 border border-teal-800/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                <Landmark className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold mt-4 text-slate-100 flex items-center gap-1.5">
                Municipal Admin
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Analyze live rainfall stress scenarios, audit priority warning queues, and dispatch response personnel.
              </p>
            </div>
            <div className="text-[9px] text-teal-400 font-bold tracking-wider uppercase">
              Open Municipal Command &rarr;
            </div>
          </Link>

          <Link href="/disaster" className="group text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] flex flex-col justify-between h-56">
            <div>
              <div className="h-9 w-9 rounded-lg bg-emerald-950/80 border border-emerald-800/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold mt-4 text-slate-100 flex items-center gap-1.5">
                Disaster Command
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Broadcast warning alert banners to city headers, export CSV incident audits, and analyze national city risk tables.
              </p>
            </div>
            <div className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase">
              Open Disaster Ops Room &rarr;
            </div>
          </Link>
        </div>

        {/* 3. Scale Pipeline Roadmap */}
        <div className="w-full mt-16 max-w-5xl border-t border-slate-900 pt-10">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            National Expansion Pipeline (Roadmap)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pipelineCities.map((p) => (
              <div key={p.name} className="p-4 rounded-xl bg-slate-900/20 border border-slate-900/40 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{p.name}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">{p.region}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  {p.issue}
                </span>
                <span className="text-[9px] text-slate-600 font-bold mt-3 uppercase tracking-wider">
                  ⚠️ IN PIPELINE
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Tech Stack highlights */}
        <div className="mt-16 w-full max-w-5xl border-t border-slate-900 pt-10 text-center">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Climate Resilience Architecture & Analytics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-900/10 border border-slate-900/30 flex flex-col items-center">
              <Database className="h-5 w-5 text-indigo-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Prisma & SQLite</span>
              <span className="text-[10px] text-slate-500 mt-1">Multi-City Boundaries</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/10 border border-slate-900/30 flex flex-col items-center">
              <Waves className="h-5 w-5 text-blue-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Dynamic Risk Engine</span>
              <span className="text-[10px] text-slate-500 mt-1">Weighted Climate Algorithms</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/10 border border-slate-900/30 flex flex-col items-center">
              <ShieldCheck className="h-5 w-5 text-emerald-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Zero-Shot AI Classifier</span>
              <span className="text-[10px] text-slate-500 mt-1">BART-Large NLP Model</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/10 border border-slate-900/30 flex flex-col items-center">
              <BarChart3 className="h-5 w-5 text-amber-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Esri Satellite Tiles</span>
              <span className="text-[10px] text-slate-500 mt-1">High Resolution GIS Layer</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/20 relative z-10 text-center py-6 mt-12">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">
          FloodPulse AI &copy; 2026. Built with Next.js App Router for the Smart City Challenge.
        </p>
      </footer>
    </div>
  );
}
