import Link from "next/link";
import { Waves, ArrowRight, User, Landmark, ShieldAlert, CheckCircle, BarChart3, Database } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Hero Navigation Header */}
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
          <div className="text-xs text-slate-400 font-semibold border border-slate-800 px-3 py-1 rounded bg-slate-900/60">
            Hackathon MVP v1.0
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-950/30 text-emerald-400 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          MCGM Mumbai South Operations
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl text-slate-100 leading-[1.1]">
          Mumbai South Flood & Drainage{" "}
          <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Risk Intelligence
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Empowering citizens, MCGM ward engineers, and disaster response teams to monitor, report, and mitigate waterlogging at hotspots (Crawford Market, Churchgate, Ballard Estate) in real time.
        </p>

        {/* Modules Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16 max-w-5xl">
          {/* Citizen App Card */}
          <Link href="/citizen" className="group text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] flex flex-col justify-between h-72">
            <div>
              <div className="h-10 w-10 rounded-xl bg-blue-950/80 border border-blue-800/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mt-4 text-slate-100 flex items-center gap-1.5">
                Citizen Portal
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Report waterlogging and blocked drains with photos and automatic GPS coordinates. Access dynamic safe routing mapped around live flood zones.
              </p>
            </div>
            <div className="text-[10px] text-blue-400 font-bold tracking-wider uppercase">
              Mobile-Friendly Web App &rarr;
            </div>
          </Link>

          {/* Municipal Dashboard Card */}
          <Link href="/municipal" className="group text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-teal-500/50 hover:bg-slate-900/80 transition-all hover:shadow-[0_0_20px_rgba(20,184,166,0.1)] flex flex-col justify-between h-72">
            <div>
              <div className="h-10 w-10 rounded-xl bg-teal-950/80 border border-teal-800/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mt-4 text-slate-100 flex items-center gap-1.5">
                Municipal Admin
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Inspect citizen reports, prioritize waterlogged hotspots, assign responses to engineering teams, and monitor ward-level performance metrics.
              </p>
            </div>
            <div className="text-[10px] text-teal-400 font-bold tracking-wider uppercase">
              Operations Center &rarr;
            </div>
          </Link>

          {/* Disaster Ops Card */}
          <Link href="/disaster" className="group text-left p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] flex flex-col justify-between h-72">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold mt-4 text-slate-100 flex items-center gap-1.5">
                Disaster Command
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Oversee citywide risk analytics, broadcast emergency flood alerts to vulnerable wards, review critical incident feeds, and export CSV audit logs.
              </p>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
              Emergency Services &rarr;
            </div>
          </Link>
        </div>

        {/* Tech Stack / Architectural highlights */}
        <div className="mt-20 w-full max-w-5xl border-t border-slate-900 pt-10 text-center">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Climate Resilience Architecture & Analytics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-900/50 flex flex-col items-center">
              <Database className="h-5 w-5 text-indigo-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Prisma & SQLite</span>
              <span className="text-[10px] text-slate-500 mt-1">Spatial Mapping Data</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-900/50 flex flex-col items-center">
              <Waves className="h-5 w-5 text-blue-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Dynamic Risk Engine</span>
              <span className="text-[10px] text-slate-500 mt-1">Rainfall & Elevation Scored</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-900/50 flex flex-col items-center">
              <CheckCircle className="h-5 w-5 text-emerald-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">AI Image Classifier</span>
              <span className="text-[10px] text-slate-500 mt-1">Automated CV Sim</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-900/50 flex flex-col items-center">
              <BarChart3 className="h-5 w-5 text-amber-400 mb-2" />
              <span className="text-xs font-bold text-slate-200">Leaflet Maps</span>
              <span className="text-[10px] text-slate-500 mt-1">Carto Dark Visualizer</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/20 relative z-10 text-center py-6">
        <p className="text-[11px] text-slate-600">
          FloodPulse AI &copy; 2026. Built with Next.js App Router for the Smart City Challenge.
        </p>
      </footer>
    </div>
  );
}
