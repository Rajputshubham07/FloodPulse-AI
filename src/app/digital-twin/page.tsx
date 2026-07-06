"use client";

import { useEffect, useState, useRef } from "react";
import Navigation from "../../components/Navigation";
import DigitalTwinMapLoader from "../../components/DigitalTwinMapLoader";
import { 
  Activity, Landmark, CloudRain, Play, Square, Compass, ShieldAlert,
  Users, MapPin, Heart, HelpCircle, RefreshCw, BarChart2, TrendingUp, Cpu
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function DigitalTwinPage() {
  const [activeCityId, setActiveCityId] = useState<string>("");
  const [activeCity, setActiveCity] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [polygons, setPolygons] = useState<any[]>([]);
  
  // Simulation Inputs
  const [simHours, setSimHours] = useState<number>(6); // 3, 6, 12, 24
  const [rainRate, setRainRate] = useState<number>(35); // mm/hr

  // Layer Toggles
  const [showPopulation, setShowPopulation] = useState(false);
  const [showInfrastructure, setShowInfrastructure] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);

  // Play animation states
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Loaders
  const [loadingSim, setLoadingSim] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  
  // Telemetry Metrics
  const [metrics, setMetrics] = useState({
    scenarioName: "Current Conditions",
    affectedPopulation: 0,
    affectedRoadLength: 0,
    floodAreaKm2: 0
  });

  const [trendData, setTrendData] = useState<any[]>([]);

  const loadBaseData = (cityId: string) => {
    fetch(`/api/cities`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const matched = data.find(c => c.id === cityId);
          if (matched) setActiveCity(matched);
        }
      });

    fetch(`/api/wards?cityId=${cityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWards(data);
      });

    fetch(`/api/incidents?cityId=${cityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setIncidents(data);
      });

    fetch(`/api/digital-twin/scenarios?cityId=${cityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setScenarios(data);
      });

    loadImpactTrends(cityId);
  };

  const loadImpactTrends = (cityId: string) => {
    setLoadingTrend(true);
    fetch(`/api/digital-twin/impact?cityId=${cityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.trendData)) {
          setTrendData(data.trendData);
        }
      })
      .finally(() => setLoadingTrend(false));
  };

  useEffect(() => {
    const initialCityId = localStorage.getItem("floodpulse_city") || "";
    setActiveCityId(initialCityId);
    if (initialCityId) {
      loadBaseData(initialCityId);
    }

    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveCityId(customEvent.detail);
        setPolygons([]);
        setMetrics({
          scenarioName: "Current Conditions",
          affectedPopulation: 0,
          affectedRoadLength: 0,
          floodAreaKm2: 0
        });
      }
    };
    window.addEventListener("cityChanged", handleCityChange);
    return () => window.removeEventListener("cityChanged", handleCityChange);
  }, []);

  useEffect(() => {
    if (activeCityId) {
      loadBaseData(activeCityId);
    }
  }, [activeCityId]);

  const handleRunSimulation = async (hours: number, rain: number) => {
    setLoadingSim(true);
    try {
      const res = await fetch("/api/digital-twin/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId: activeCityId,
          rainfallAmount: rain,
          simulationHours: hours
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMetrics({
          scenarioName: data.scenarioName,
          affectedPopulation: data.affectedPopulation,
          affectedRoadLength: data.affectedRoadLength,
          floodAreaKm2: data.floodAreaKm2
        });

        // Load generated polygons
        const polyRes = await fetch(`/api/digital-twin/polygons?scenarioId=${data.id}`);
        const polyData = await polyRes.json();
        if (polyRes.ok) {
          setPolygons(polyData);
        }
        
        loadBaseData(activeCityId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSim(false);
    }
  };

  const handleLoadScenario = async (sc: any) => {
    setMetrics({
      scenarioName: sc.scenarioName,
      affectedPopulation: sc.affectedPopulation,
      affectedRoadLength: sc.affectedRoadLength,
      floodAreaKm2: sc.floodAreaKm2
    });
    setSimHours(sc.simulationHours);
    setRainRate(sc.rainfallAmount);

    setLoadingSim(true);
    try {
      const polyRes = await fetch(`/api/digital-twin/polygons?scenarioId=${sc.id}`);
      const polyData = await polyRes.json();
      if (polyRes.ok) {
        setPolygons(polyData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSim(false);
    }
  };

  // Play/Animate flood progression loop over time (3h -> 6h -> 12h -> 24h)
  const togglePlayAnimation = () => {
    if (isPlaying) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const times = [3, 6, 12, 24];
      let idx = 0;
      handleRunSimulation(times[idx], rainRate);
      
      const interval = setInterval(() => {
        idx = (idx + 1) % times.length;
        setSimHours(times[idx]);
        handleRunSimulation(times[idx], rainRate);
      }, 5000); // cycle every 5 seconds
      
      playIntervalRef.current = interval;
    }
  };

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  // Emergency Recommendations Planning parameters
  const criticalShelterCount = Math.ceil(metrics.affectedPopulation / 400);
  const pumpUnitsRequired = Math.ceil(metrics.floodAreaKm2 * 3.5);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden relative">
        
        {/* Left Side: Simulation & Layer Controls Panel */}
        <div className="lg:col-span-1 border-r border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                Digital Twin Center
              </span>
              <h2 className="text-lg font-bold mt-1 text-slate-100">GIS Simulation Portal</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Run hydrological water accumulation models, adjust rainfall, and animate flood spread boundary layers.
              </p>
            </div>

            {/* Scenario Sliders Controls */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-900 space-y-3.5">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <CloudRain className="h-3.5 w-3.5 text-blue-400" />
                Scenario Parameter Inputs
              </h3>

              {/* Rain Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Rainfall Intensity</span>
                  <span className="text-blue-400">{rainRate} mm/hr</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={rainRate}
                  onChange={(e) => setRainRate(parseInt(e.target.value))}
                  className="w-full accent-blue-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                />
              </div>

              {/* Time Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Simulation Window</span>
                  <span className="text-blue-400">{simHours} Hours</span>
                </div>
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-900 text-[10px] font-bold text-slate-400">
                  {([3, 6, 12, 24] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setSimHours(h)}
                      className={`flex-1 py-1 rounded transition-colors ${
                        simHours === h 
                          ? "bg-blue-600 text-white" 
                          : "hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      {h} Hours
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <button
                  onClick={() => handleRunSimulation(simHours, rainRate)}
                  disabled={loadingSim}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 text-slate-950 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {loadingSim ? "Modeling..." : "Run Model"}
                </button>
                <button
                  onClick={togglePlayAnimation}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                    isPlaying 
                      ? "bg-red-950/40 text-red-400 border-red-900/50" 
                      : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="h-3 w-3 fill-current" /> Stop Loop
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" /> Animate Spread
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* GIS Map Layers Controls */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-900 space-y-2.5">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <Compass className="h-3.5 w-3.5 text-emerald-400" />
                Active Map Layers
              </h3>

              <div className="space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showPopulation}
                    onChange={(e) => setShowPopulation(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  <span>Population Exposure grid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showInfrastructure}
                    onChange={(e) => setShowInfrastructure(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  <span>Critical Infrastructure Assets</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showShelters}
                    onChange={(e) => setShowShelters(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  <span>Evacuation Shelters</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showHospitals}
                    onChange={(e) => setShowHospitals(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  <span>Emergency Medical Centers</span>
                </label>
              </div>
            </div>

            {/* Saved Scenarios Manager */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Saved Simulation Runs ({scenarios.length})
              </span>

              <div className="space-y-1.5 max-h-[22vh] overflow-y-auto pr-1">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleLoadScenario(sc)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all text-[11px] flex flex-col gap-1"
                  >
                    <div className="flex justify-between font-bold text-slate-300">
                      <span className="truncate max-w-[120px]">{sc.scenarioName.split(" (")[0]}</span>
                      <span className="text-[10px] text-blue-400">{sc.rainfallAmount} mm/h</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>Area: {sc.floodAreaKm2} km&sup2;</span>
                      <span>{new Date(sc.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
          <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center">
            Digital Twin v1.2
          </div>
        </div>

        {/* Center Panel: Map Loader (2 Cols) */}
        <div className="lg:col-span-2 h-[calc(100vh-3.5rem)] relative">
          <DigitalTwinMapLoader
            wards={wards}
            incidents={incidents}
            polygons={polygons}
            showPopulation={showPopulation}
            showInfrastructure={showInfrastructure}
            showShelters={showShelters}
            showHospitals={showHospitals}
            cityCenter={activeCity ? [activeCity.latitude, activeCity.longitude] : undefined}
            cityZoom={activeCity ? activeCity.zoomLevel : undefined}
          />
        </div>

        {/* Right Side: Simulation Impact Analytics & AI Insights */}
        <div className="lg:col-span-1 border-l border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-4">
            
            {/* Impact Title */}
            <div>
              <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                <BarChart2 className="h-3.5 w-3.5" />
                Telemetry Stats
              </span>
              <h2 className="text-base font-bold mt-0.5 text-slate-200">Simulation Run Impact</h2>
              <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">{metrics.scenarioName}</p>
            </div>

            {/* Impact stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center">
                <Users className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                <span className="block text-sm font-black text-slate-200">
                  {metrics.affectedPopulation.toLocaleString()}
                </span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Pop Exposed</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center">
                <Compass className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                <span className="block text-sm font-black text-slate-200">
                  {metrics.affectedRoadLength} km
                </span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Road Blocked</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center">
                <ShieldAlert className="h-4 w-4 text-red-400 mx-auto mb-1 animate-pulse" />
                <span className="block text-sm font-black text-slate-200">
                  {metrics.floodAreaKm2} km&sup2;
                </span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Flood Area</span>
              </div>
            </div>

            {/* AI Generated Predictive Summaries */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-blue-950/40 space-y-1.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Digital Twin AI Summary
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                {metrics.affectedPopulation > 0
                  ? `Simulated rainfall of ${rainRate}mm/hr over ${simHours} hours combined with low-elevation channels triggers flooding spreads affecting approximately ${metrics.affectedPopulation.toLocaleString()} residents and ${metrics.affectedRoadLength}km of roads.`
                  : "Stable conditions predicted. Drainage capacity satisfies base meteorological load."
                }
              </p>
            </div>

            {/* Recharts Impact Trends */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3.5 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                Timeline Exposure Trend
              </h4>
              <div className="h-28 w-full text-[9px]">
                {loadingTrend ? (
                  <p className="text-slate-500 text-center pt-8">Loading timeline charts...</p>
                ) : trendData.length === 0 ? (
                  <p className="text-slate-600 text-center pt-8">No timeline runs mapped yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorPop" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="hours" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b1329', borderColor: '#1e293b', color: '#fff' }} 
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="population" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPop)" name="Population" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Evacuation Mobilization Recommendations */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-900 space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Landmark className="h-3.5 w-3.5 text-emerald-400" />
                Logistics Mobilization Checklist
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Activate Emergency Shelters:</span>
                  <strong className="text-slate-200">{criticalShelterCount > 0 ? `${criticalShelterCount} centers` : "0 (Standby)"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Deploy Submersible Pumps:</span>
                  <strong className="text-slate-200">{pumpUnitsRequired > 0 ? `${pumpUnitsRequired} units` : "0 (Standby)"}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Evacuation Routes Status:</span>
                  <strong className={metrics.affectedRoadLength > 10 ? "text-red-400 font-bold" : "text-emerald-400"}>
                    {metrics.affectedRoadLength > 10 ? "Rerouting Active" : "Operational"}
                  </strong>
                </div>
              </div>
            </div>

          </div>
          
          <div className="pt-2 border-t border-slate-900 flex justify-between text-[10px] text-slate-600 font-semibold">
            <span>Operator: Elena Rostova</span>
            <span>v1.2.0</span>
          </div>
        </div>

      </div>
    </div>
  );
}
