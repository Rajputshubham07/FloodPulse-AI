import { MapContainer, TileLayer, Polygon, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { ShieldAlert, Compass, Eye, MapPin, CheckCircle, HelpCircle } from "lucide-react";

// Coordinate boundaries limits
const CITY_OUTER_LIMITS: Record<string, [number, number][]> = {
  "Mumbai": [
    [18.895, 72.805], [18.895, 72.845], [18.925, 72.855], [18.968, 72.848],
    [18.980, 72.815], [18.960, 72.795], [18.915, 72.795], [18.895, 72.805]
  ],
  "Bengaluru": [
    [12.860, 77.540], [12.860, 77.680], [12.920, 77.720], [13.060, 77.720],
    [13.080, 77.640], [13.040, 77.520], [12.940, 77.520], [12.860, 77.540]
  ],
  "Chennai": [
    [12.950, 80.180], [12.950, 80.260], [13.020, 80.280], [13.150, 80.320],
    [13.170, 80.240], [13.080, 80.160], [12.980, 80.160], [12.950, 80.180]
  ],
  "Hyderabad": [
    [17.340, 78.360], [17.330, 78.540], [17.420, 78.570], [17.520, 78.500],
    [17.500, 78.380], [17.420, 78.320], [17.340, 78.360]
  ],
  "Guwahati": [
    [26.13, 91.70], [26.13, 91.80], [26.16, 91.83], [26.20, 91.83],
    [26.23, 91.80], [26.23, 91.70], [26.20, 91.67], [26.16, 91.67], [26.13, 91.70]
  ]
};

const getRiskColor = (level: string) => {
  switch (level) {
    case "CRITICAL": return "#ef4444";
    case "HIGH": return "#f97316";
    case "MEDIUM": return "#eab308";
    default: return "#22c55e";
  }
};

interface SatelliteMapProps {
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

function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export default function SatelliteMap({
  wards,
  incidents,
  polygons,
  verifiedReports,
  unverifiedReports,
  cityCenter = [18.93, 72.83],
  cityZoom = 13,
  showDetections,
  showWards
}: SatelliteMapProps) {
  const activeCityName = wards[0]?.city?.name || "Mumbai";
  const cityLimits = CITY_OUTER_LIMITS[activeCityName] || CITY_OUTER_LIMITS["Mumbai"];

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={cityCenter}
        zoom={cityZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <MapViewUpdater center={cityCenter} zoom={cityZoom} />

        {/* Satellite Base Imagery */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
        />

        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution='Labels &copy; Esri'
        />

        {/* Outer City limits */}
        {cityLimits && (
          <Polygon
            positions={cityLimits}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              dashArray: "10, 15",
              fill: false,
              interactive: false
            }}
          />
        )}

        {/* Ward limits */}
        {showWards && wards.map((ward) => {
          try {
            const geo = JSON.parse(ward.boundaryJson);
            const coords = geo.geometry.coordinates[0];
            const leafletCoords = coords.map((c: number[]) => [c[1], c[0]]);

            return (
              <Polygon
                key={ward.id}
                positions={leafletCoords}
                pathOptions={{
                  fill: false,
                  color: "#475569",
                  weight: 1,
                  dashArray: "4, 4"
                }}
              />
            );
          } catch (e) {
            return null;
          }
        })}

        {/* Satellite-Detected Flood Polygons */}
        {showDetections && polygons.map((poly) => {
          try {
            const coords = poly.geometry.geometry.coordinates[0];
            const leafletCoords = coords.map((c: number[]) => [c[1], c[0]]);

            return (
              <Polygon
                key={poly.id}
                positions={leafletCoords}
                pathOptions={{
                  fillColor: "#0284c7", // Sky blue for satellite water detection
                  fillOpacity: 0.35,
                  color: "#38bdf8",
                  weight: 2,
                  dashArray: "3, 5"
                }}
              >
                <Popup>
                  <div className="p-1.5 text-xs">
                    <h4 className="font-bold text-sky-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Satellite Inundation Zone
                    </h4>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                      <p>Detected Area: <span className="font-semibold text-white">{poly.areaKm2.toFixed(2)} km&sup2;</span></p>
                      <p>Sensor Severity: <span className="font-semibold" style={{ color: getRiskColor(poly.severity) }}>{poly.severity}</span></p>
                      <p>Algorithm Confidence: <span className="font-semibold text-white">{poly.confidence}%</span></p>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          } catch (e) {
            return null;
          }
        })}

        {/* Ground-Truth: Verified Reports (Blue Green) */}
        {verifiedReports.map((inc) => (
          <CircleMarker
            key={`verified-${inc.id}`}
            center={[inc.latitude, inc.longitude]}
            radius={8}
            pathOptions={{
              fillColor: "#10b981", // Emerald Green
              fillOpacity: 1,
              color: "#ffffff",
              weight: 2
            }}
          >
            <Popup>
              <div className="p-1.5 text-xs max-w-[200px]">
                <h4 className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Satellite-Verified Report
                </h4>
                <p className="text-slate-200 mt-1 italic">"{inc.description}"</p>
                <p className="text-[10px] text-slate-400 mt-1">Reporter: {inc.reporterName || "Anonymous"}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Ground-Truth: Unverified Reports (Orange) */}
        {unverifiedReports.map((inc) => (
          <CircleMarker
            key={`unverified-${inc.id}`}
            center={[inc.latitude, inc.longitude]}
            radius={8}
            pathOptions={{
              fillColor: "#f97316", // Orange
              fillOpacity: 1,
              color: "#ffffff",
              weight: 2
            }}
          >
            <Popup>
              <div className="p-1.5 text-xs max-w-[200px]">
                <h4 className="font-bold text-orange-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                  Unverified Ground Report
                </h4>
                <p className="text-slate-200 mt-1 italic">"{inc.description}"</p>
                <p className="text-[10px] text-slate-500 mt-1">No overlapping satellite water signal found.</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      </MapContainer>
    </div>
  );
}
