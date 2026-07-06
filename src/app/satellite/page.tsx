"use client";

import { useEffect, useState } from "react";
import Navigation from "../../components/Navigation";
import SatelliteMapLoader from "../../components/SatelliteMapLoader";
import { 
  Activity, CloudRain, Compass, Cpu, Landmark, ShieldAlert,
  Send, RefreshCw, BarChart2, ShieldCheck, HelpCircle, Layers, CheckCircle
} from "lucide-react";

export default function SatellitePage() {
  const [activeCityId, setActiveCityId] = useState<string>("");
  const [activeCity, setActiveCity] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [satImages, setSatImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [detections, setDetections] = useState<any[]>([]);

  // Sensor selection and run simulation control
  const [sensorSource, setSensorSource] = useState<"Sentinel-1 SAR" | "Sentinel-2 NDWI">("Sentinel-1 SAR");
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  // Overlay toggles
  const [showDetections, setShowDetections] = useState(true);
  const [showWards, setShowWards] = useState(true);

  // Verification lists
  const [verifiedReports, setVerifiedReports] = useState<any[]>([]);
  const [unverifiedReports, setUnverifiedReports] = useState<any[]>([]);
  const [satelliteOnlyWards, setSatelliteOnlyWards] = useState<string[]>([]);

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

    fetch(`/api/satellite/images?cityId=${cityId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSatImages(data);
          if (data.length > 0 && !selectedImage) {
            setSelectedImage(data[0]);
          }
        }
      });
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
        setSelectedImage(null);
        setDetections([]);
        setVerifiedReports([]);
        setUnverifiedReports([]);
        setSatelliteOnlyWards([]);
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

  useEffect(() => {
    if (selectedImage) {
      fetch(`/api/satellite/detections?imageId=${selectedImage.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setDetections(data);
            runComparisonEngine(data, incidents);
          }
        });
    }
  }, [selectedImage, incidents]);

  // Comparison Engine Logic:
  // Verifies citizen reports by checking if they fall within 500m (approx 0.005 deg) of any satellite polygon centroid
  const runComparisonEngine = (polys: any[], reps: any[]) => {
    const activeReps = reps.filter(r => r.status !== "RESOLVED");
    const verified: any[] = [];
    const unverified: any[] = [];

    activeReps.forEach(rep => {
      let isVerified = false;
      
      polys.forEach(poly => {
        try {
          const coords = poly.geometry.geometry.coordinates[0];
          // Get approximate centroid
          const latSum = coords.reduce((sum: number, c: number[]) => sum + c[1], 0);
          const lonSum = coords.reduce((sum: number, c: number[]) => sum + c[0], 0);
          const centroidLat = latSum / coords.length;
          const centroidLon = lonSum / coords.length;

          // Simple distance formula (within ~600 meters)
          const distance = Math.sqrt(Math.pow(rep.latitude - centroidLat, 2) + Math.pow(rep.longitude - centroidLon, 2));
          if (distance < 0.006) {
            isVerified = true;
          }
        } catch (e) {
          // coordinate error
        }
      });

      if (isVerified) {
        verified.push(rep);
      } else {
        unverified.push(rep);
      }
    });

    setVerifiedReports(verified);
    setUnverifiedReports(unverified);

    // Identify wards where satellite detected flooding but there are NO active citizen reports
    const satWards: string[] = [];
    polys.forEach(poly => {
      // Find ward containing this polygon center
      try {
        const coords = poly.geometry.geometry.coordinates[0];
        const centroidLat = coords.reduce((sum: number, c: number[]) => sum + c[1], 0) / coords.length;
        const centroidLon = coords.reduce((sum: number, c: number[]) => sum + c[0], 0) / coords.length;

        // Find matching ward by finding nearest ward boundary
        let nearestWard: any = null;
        let minDist = 999;
        wards.forEach(w => {
          try {
            const boundary = JSON.parse(w.boundaryJson).geometry.coordinates[0][0];
            const wDist = Math.sqrt(Math.pow(centroidLat - boundary[1], 2) + Math.pow(centroidLon - boundary[0], 2));
            if (wDist < minDist) {
              minDist = wDist;
              nearestWard = w;
            }
          } catch(e) {}
        });

        if (nearestWard) {
          const reportsInWard = activeReps.filter(r => r.wardId === nearestWard.id);
          if (reportsInWard.length === 0 && !satWards.includes(nearestWard.name)) {
            satWards.push(nearestWard.name);
          }
        }
      } catch (e) {}
    });

    setSatelliteOnlyWards(satWards);
  };

  const handleTriggerAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const res = await fetch("/api/satellite/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId: activeCityId,
          source: sensorSource
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${sensorSource} analysis complete! Newly detected flood zones generated.`);
        loadBaseData(activeCityId);
        if (data.imageUrl) {
          // Refresh images and select new one
          fetch(`/api/satellite/images?cityId=${activeCityId}`)
            .then(r => r.json())
            .then(imgs => {
              if (Array.isArray(imgs) && imgs.length > 0) {
                setSatImages(imgs);
                setSelectedImage(imgs[0]);
              }
            });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningAnalysis(false);
    }
  };

  // Spectral evaluation script display snippet
  const evalscriptCode = `// Sentinel-2 NDWI Spectral Formula
let green = samples.B03;
let nir = samples.B08;
let ndwi = (green - nir) / (green + nir);
return ndwi > 0.28;`;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      <Navigation />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden relative">
        
        {/* Left Side: Sensor Analysis controls */}
        <div className="lg:col-span-1 border-r border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
                Remote Sensing Portal
              </span>
              <h2 className="text-lg font-bold mt-1 text-slate-100">Satellite Flood Verification</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Analyze SAR backscatter & optical NDWI spectral indices directly from Sentinel-1 & Sentinel-2.
              </p>
            </div>

            {/* Parameter selection panel */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-900 space-y-3.5">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <Cpu className="h-3.5 w-3.5 text-sky-400" />
                Radar / Optical Sensors
              </h3>

              {/* Sensor Selection Toggle */}
              <div className="space-y-2">
                <label className="block text-[10px] text-slate-400 uppercase font-bold">Select Active Sensor</label>
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-900 text-[10px] font-bold text-slate-400">
                  <button
                    onClick={() => setSensorSource("Sentinel-1 SAR")}
                    className={`flex-1 py-1 rounded transition-colors ${
                      sensorSource === "Sentinel-1 SAR"
                        ? "bg-sky-600 text-white"
                        : "hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    Sentinel-1 SAR
                  </button>
                  <button
                    onClick={() => setSensorSource("Sentinel-2 NDWI")}
                    className={`flex-1 py-1 rounded transition-colors ${
                      sensorSource === "Sentinel-2 NDWI"
                        ? "bg-sky-600 text-white"
                        : "hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    Sentinel-2 NDWI
                  </button>
                </div>
              </div>

              {/* Trigger Analysis Button */}
              <button
                onClick={handleTriggerAnalysis}
                disabled={runningAnalysis}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-sky-950/20"
              >
                {runningAnalysis ? "Processing Spectral Bands..." : "Run Satellite Detection"}
              </button>
            </div>

            {/* Sentinel Hub Custom Script Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-900 space-y-2">
              <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <Compass className="h-3.5 w-3.5 text-blue-400" />
                Sentinel Hub Evalscript
              </h3>
              <pre className="text-[9px] bg-slate-950/80 p-2.5 rounded border border-slate-900 text-slate-400 font-mono overflow-x-auto whitespace-pre leading-relaxed">
                {evalscriptCode}
              </pre>
            </div>

            {/* Acquired Imagery Catalog */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Acquired Satellite Tiles ({satImages.length})
              </span>

              <div className="space-y-1.5 max-h-[22vh] overflow-y-auto pr-1">
                {satImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-[11px] flex flex-col gap-1 ${
                      selectedImage?.id === img.id
                        ? "bg-slate-900 border-sky-500"
                        : "bg-slate-900/10 border-slate-900 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between font-bold text-slate-300">
                      <span>{img.source}</span>
                      <span className="text-[10px] text-sky-400">{img.metadata?.satellite || "Sentinel"}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>Cloud Cover: {img.metadata?.cloudCover !== undefined ? `${img.metadata.cloudCover}%` : "0% (radar)"}</span>
                      <span>{new Date(img.acquisitionDate).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
          <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center">
            Satellite Engine v2.1
          </div>
        </div>

        {/* Center Panel: Satellite Map Loader (2 Cols) */}
        <div className="lg:col-span-2 h-[calc(100vh-3.5rem)] relative">
          <SatelliteMapLoader
            wards={wards}
            incidents={incidents}
            polygons={detections}
            verifiedReports={verifiedReports}
            unverifiedReports={unverifiedReports}
            cityCenter={activeCity ? [activeCity.latitude, activeCity.longitude] : undefined}
            cityZoom={activeCity ? activeCity.zoomLevel : undefined}
            showDetections={showDetections}
            showWards={showWards}
          />

          {/* Floating Map toggles */}
          <div className="absolute bottom-4 right-4 z-[1000] glass-panel bg-slate-900/90 border border-slate-700 p-2 rounded-lg shadow-lg flex items-center gap-3 text-xs pointer-events-auto">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium hover:text-white">
              <input
                type="checkbox"
                checked={showDetections}
                onChange={(e) => setShowDetections(e.target.checked)}
                className="accent-sky-400"
              />
              <span>Inundation Areas</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium hover:text-white">
              <input
                type="checkbox"
                checked={showWards}
                onChange={(e) => setShowWards(e.target.checked)}
                className="accent-sky-400"
              />
              <span>Ward Bounds</span>
            </label>
          </div>
        </div>

        {/* Right Side: Ground-Truth Comparison Engine & Future AI Architectures */}
        <div className="lg:col-span-1 border-l border-slate-900 bg-slate-950/60 p-4 flex flex-col justify-between h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-4">
            
            {/* Engine title */}
            <div>
              <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                <BarChart2 className="h-3.5 w-3.5" />
                Comparison Engine
              </span>
              <h2 className="text-base font-bold mt-0.5 text-slate-200">Ground-Truth Verification</h2>
              <p className="text-[10px] text-slate-500 font-medium italic mt-0.5">Satellite vs Citizen Reports</p>
            </div>

            {/* Statistics comparison grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center">
                <CheckCircle className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <span className="block text-sm font-black text-slate-200">
                  {verifiedReports.length}
                </span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Verified</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center">
                <HelpCircle className="h-4 w-4 text-orange-400 mx-auto mb-1 animate-pulse" />
                <span className="block text-sm font-black text-slate-200">
                  {unverifiedReports.length}
                </span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Unverified</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-xl text-center">
                <ShieldAlert className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                <span className="block text-sm font-black text-slate-200">
                  {satelliteOnlyWards.length}
                </span>
                <span className="text-[8px] text-slate-500 uppercase font-bold">Sat Only Wards</span>
              </div>
            </div>

            {/* Remote Sensing AI Insights Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-sky-950/40 space-y-1.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-sky-500 animate-pulse" />
              <h4 className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3" /> Satellite AI Analytics
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                {detections.length > 0
                  ? `Satellite verification detected approx ${detections.reduce((sum, d) => sum + d.areaKm2, 0).toFixed(2)} sq km of total flooding. ${verifiedReports.length} citizen ground reports have been verified within 500m of radar backscatter signatures.`
                  : "Execute satellite detection model to extract surface water boundary polygons."
                }
              </p>
            </div>

            {/* Satellite Only Wards Warning Panel */}
            {satelliteOnlyWards.length > 0 && (
              <div className="p-3.5 rounded-xl bg-red-950/10 border border-red-900/30 space-y-2">
                <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                  Satellite-Only Flood Alarms
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  The following wards have satellite-detected flood layers but no citizen reports yet (potential blackouts):
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {satelliteOnlyWards.map((wName, idx) => (
                    <span key={idx} className="bg-red-900/30 text-red-300 text-[9px] font-bold px-2 py-0.5 rounded border border-red-800/30">
                      {wName.split(":")[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Future Deep Learning Architectures panel */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-900 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                DL Segmentation Engines
              </h4>
              <div className="space-y-2 text-[10px] text-slate-400 leading-relaxed">
                <p>
                  Pipeline is pre-architected to host deep learning semantic segmentation models on target Sentinel imagery bands:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong className="text-slate-300">U-Net</strong>: Fine-grained spatial boundaries.</li>
                  <li><strong className="text-slate-300">SegFormer (Transformer)</strong>: Global context attention.</li>
                  <li><strong className="text-slate-300">YOLOv8-seg</strong>: Real-time inference on GEE tiles.</li>
                </ul>
              </div>
            </div>

          </div>
          
          <div className="pt-2 border-t border-slate-900 flex justify-between text-[10px] text-slate-600 font-semibold">
            <span>Operator: Elena Rostova</span>
            <span>v2.1.0</span>
          </div>
        </div>

      </div>
    </div>
  );
}
