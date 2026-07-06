import dynamic from "next/dynamic";
import { Activity } from "lucide-react";

const DynamicMap = dynamic(() => import("./DigitalTwinMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-xl">
      <Activity className="h-8 w-8 text-blue-400 animate-pulse mb-2" />
      <span className="text-slate-400 text-xs font-medium">Loading Digital Twin Geometry Layers...</span>
    </div>
  )
});

interface DigitalTwinMapLoaderProps {
  wards: any[];
  incidents: any[];
  polygons: any[];
  showPopulation: boolean;
  showInfrastructure: boolean;
  showShelters: boolean;
  showHospitals: boolean;
  cityCenter?: [number, number];
  cityZoom?: number;
}

export default function DigitalTwinMapLoader(props: DigitalTwinMapLoaderProps) {
  return <DynamicMap {...props} />;
}
