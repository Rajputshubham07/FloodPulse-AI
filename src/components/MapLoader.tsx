"use client";

import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

// Dynamically import InteractiveMap with ssr disabled
const DynamicMap = dynamic(() => import("./InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-xl">
      <Activity className="h-8 w-8 text-emerald-400 animate-pulse mb-2" />
      <span className="text-slate-400 text-xs font-medium">Initializing Geospatial Layers...</span>
    </div>
  )
});

interface MapLoaderProps {
  wards: any[];
  incidents: any[];
  selectedIncident?: any;
  onSelectIncident?: (incident: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
  reportCoordinates?: [number, number] | null;
  safeRoutePath?: [number, number][];
}

export default function MapLoader(props: MapLoaderProps) {
  return <DynamicMap {...props} />;
}
