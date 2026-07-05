"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waves, ShieldAlert, Landmark, User, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>("");

  useEffect(() => {
    // 1. Fetch cities
    fetch("/api/cities")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCities(data);
          // Set initial default city from localStorage or fallback to first city
          const stored = localStorage.getItem("floodpulse_city");
          const defaultCityId = stored || (data[0] ? data[0].id : "");
          if (defaultCityId) {
            setSelectedCityId(defaultCityId);
            if (!stored) localStorage.setItem("floodpulse_city", defaultCityId);
          }
        }
      })
      .catch((err) => console.error("Error loading cities:", err));
  }, []);

  // Fetch alerts filtered by active city
  useEffect(() => {
    if (!selectedCityId) return;
    fetch(`/api/alerts?cityId=${selectedCityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveAlerts(data.filter(a => a.isActive));
        }
      })
      .catch((err) => console.error("Error loading alerts:", err));
  }, [selectedCityId]);

  // Handle external/internal updates to localstorage city
  useEffect(() => {
    const handleCityEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setSelectedCityId(customEvent.detail);
      }
    };
    window.addEventListener("cityChanged", handleCityEvent);
    return () => window.removeEventListener("cityChanged", handleCityEvent);
  }, []);

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    localStorage.setItem("floodpulse_city", cityId);
    window.dispatchEvent(new CustomEvent("cityChanged", { detail: cityId }));
  };

  const navItems = [
    { href: "/citizen", label: "Citizen App", icon: User },
    { href: "/municipal", label: "Muni Panel", icon: Landmark },
    { href: "/disaster", label: "Disaster Ops", icon: ShieldAlert },
  ];

  return (
    <header className="sticky top-0 z-[2000] w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      {/* Dynamic Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-950/60 border-b border-red-800/40 text-red-200 text-[11px] font-medium py-1 px-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
            <Zap className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <span>
              <strong className="text-red-400 font-semibold">Active Emergency Warning:</strong> {activeAlerts[0].message}
            </span>
          </div>
          {activeAlerts.length > 1 && (
            <span className="shrink-0 text-red-400 text-[10px] ml-2 bg-red-900/50 px-1.5 py-0.5 rounded font-bold">
              +{activeAlerts.length - 1} more
            </span>
          )}
        </div>
      )}

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950">
              <Waves className="h-4.5 w-4.5 text-emerald-400" />
            </div>
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-blue-400 via-slate-100 to-emerald-400 bg-clip-text text-transparent">
              FloodPulse AI
            </span>
          </div>
        </Link>

        {/* City Selector and Navigation */}
        <div className="flex items-center gap-3">
          {cities.length > 0 && (
            <select
              value={selectedCityId}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500/60 font-semibold cursor-pointer max-w-[130px] sm:max-w-none"
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  📍 {city.name}
                </option>
              ))}
            </select>
          )}

          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-slate-800/80 text-emerald-400 border border-slate-700/60"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100 border border-transparent"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
