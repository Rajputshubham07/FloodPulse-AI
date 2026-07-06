import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

const DynamicMap = dynamic(() => import("./SatelliteMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-xl">
      <Activity className="h-8 w-8 text-sky-400 animate-pulse mb-2" />
      <span className="text-slate-400 text-xs font-medium">Initializing Spectral Satellites Imagery...</span>
    </div>
  )
});

interface SatelliteMapLoaderProps {
  wards: any[];
  incidents: any[];
  polygons: any[];
  verifiedReports: any[];
  unverifiedReports: any[];
  cityCenter?: [number, number];
  cityZoom?: number;
  showDetections: boolean;
  showWards: boolean;
}

export default function SatelliteMapLoader(props: SatelliteMapLoaderProps) {
  return <DynamicMap {...props} />;
}
