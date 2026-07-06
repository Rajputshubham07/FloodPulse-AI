import { MapContainer, TileLayer, Polygon, Popup, CircleMarker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";
import { ShieldAlert, Landmark, Shield, AlertTriangle, Activity } from "lucide-react";

// Fix standard Leaflet icon paths
const iconDefault = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = iconDefault;

interface DigitalTwinMapProps {
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

// Critical infrastructure, shelters, and hospital markers
const CRITICAL_ASSETS = {
  "Mumbai": {
    shelters: [
      { name: "Crawford Market Relief Center", lat: 18.948, lng: 72.835, capacity: 500 },
      { name: "Colaba Community Sports Hall", lat: 18.910, lng: 72.825, capacity: 350 }
    ],
    hospitals: [
      { name: "JJ Municipal Hospital", lat: 18.960, lng: 72.837, beds: 120 },
      { name: "St. George Trauma Center", lat: 18.940, lng: 72.839, beds: 85 }
    ],
    infra: [
      { name: "Churchgate Subdrain Pump Station", lat: 18.932, lng: 72.822, status: "OPERATIONAL" },
      { name: "Marine Drive Sea Wall Gate", lat: 18.942, lng: 72.820, status: "CLOSED" }
    ]
  },
  "Bengaluru": {
    shelters: [
      { name: "Mahadevapura Relief Center", lat: 12.985, lng: 77.675, capacity: 400 }
    ],
    hospitals: [
      { name: "Kundanahalli General Hospital", lat: 12.965, lng: 77.712, beds: 150 }
    ],
    infra: [
      { name: "IT Corridor Sluice Gate", lat: 12.975, lng: 77.695, status: "OPEN" }
    ]
  },
  "Chennai": {
    shelters: [
      { name: "Velachery Drainage Shelter", lat: 12.980, lng: 80.222, capacity: 600 }
    ],
    hospitals: [
      { name: "GCC Velachery Hospital", lat: 12.990, lng: 80.218, beds: 200 }
    ],
    infra: [
      { name: "Pallikaranai Canal Pump", lat: 12.970, lng: 80.215, status: "CRITICAL" }
    ]
  },
  "Hyderabad": {
    shelters: [
      { name: "Begumpet Indoor Stadium Shelter", lat: 17.448, lng: 78.465, capacity: 800 }
    ],
    hospitals: [
      { name: "Begumpet General Hospital", lat: 17.438, lng: 78.475, beds: 180 }
    ],
    infra: [
      { name: "Kukatpally Nala Outflow Gate", lat: 17.452, lng: 78.455, status: "OPERATIONAL" }
    ]
  },
  "Guwahati": {
    shelters: [
      { name: "Zoo Road High School Shelter", lat: 26.168, lng: 91.785, capacity: 500 }
    ],
    hospitals: [
      { name: "Anil Nagar Health Center", lat: 26.178, lng: 91.755, beds: 100 }
    ],
    infra: [
      { name: "Brahmaputra River Pump Station", lat: 26.185, lng: 91.765, status: "OPERATIONAL" }
    ]
  }
};

const getRiskColor = (level: string) => {
  switch (level) {
    case "CRITICAL": return "#ef4444"; // Red
    case "HIGH": return "#f97316"; // Orange
    case "MEDIUM": return "#eab308"; // Yellow
    default: return "#22c55e"; // Green
  }
};

function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export default function DigitalTwinMap({
  wards,
  incidents,
  polygons,
  showPopulation,
  showInfrastructure,
  showShelters,
  showHospitals,
  cityCenter = [18.93, 72.83],
  cityZoom = 13
}: DigitalTwinMapProps) {
  const activeCityName = wards[0]?.city?.name || "Mumbai";
  const cityLimits = CITY_OUTER_LIMITS[activeCityName] || CITY_OUTER_LIMITS["Mumbai"];
  const assets = CRITICAL_ASSETS[activeCityName as keyof typeof CRITICAL_ASSETS] || CRITICAL_ASSETS["Mumbai"];

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={cityCenter}
        zoom={cityZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <MapViewUpdater center={cityCenter} zoom={cityZoom} />

        {/* 1. Base Layer Stack: Esri World Imagery (Satellite) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        />

        {/* 2. Hybrid Reference Overlay: Roads, Boundaries & Labels */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution='Labels &copy; Esri'
        />

        {/* 3. Outer City Limits Boundary */}
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

        {/* 4. Active Incident Hotspots */}
        {incidents
          .filter((i) => i.status !== "RESOLVED")
          .map((inc) => (
            <CircleMarker
              key={`hotspot-${inc.id}`}
              center={[inc.latitude, inc.longitude]}
              radius={7}
              pathOptions={{
                fillColor: "#ef4444",
                fillOpacity: 0.9,
                color: "#ffffff",
                weight: 1.5
              }}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <p className="font-bold text-red-400 uppercase tracking-wider text-[9px]">Active Waterlogging</p>
                  <p className="font-semibold mt-0.5 text-slate-100">{inc.description}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 5. Dynamic Flood Polygons (Simulation Heatmap Overlay) */}
        {polygons.map((poly) => {
          try {
            // GeoJSON coordinates standard: [lon, lat]
            const coords = poly.geometry.geometry.coordinates[0];
            const leafletCoords = coords.map((c: number[]) => [c[1], c[0]]);

            return (
              <Polygon
                key={poly.id}
                positions={leafletCoords}
                pathOptions={{
                  fillColor: getRiskColor(poly.severity),
                  fillOpacity: poly.severity === "CRITICAL" ? 0.45 : poly.severity === "HIGH" ? 0.35 : 0.2,
                  color: getRiskColor(poly.severity),
                  weight: 2,
                  dashArray: "3, 5"
                }}
              >
                <Popup>
                  <div className="p-1.5 text-xs max-w-[200px]">
                    <h4 className="font-bold text-slate-100 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      Dynamic Flood Spread
                    </h4>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                      <p>Water Depth: <span className="font-semibold text-white">{poly.waterDepth.toFixed(2)}m</span></p>
                      <p>Severity: <span className="font-semibold" style={{ color: getRiskColor(poly.severity) }}>{poly.severity}</span></p>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          } catch (e) {
            console.error("Failed to parse polygon coordinates:", e);
            return null;
          }
        })}

        {/* 6. Evacuation Shelters Layer */}
        {showShelters &&
          assets.shelters.map((shelter, idx) => (
            <CircleMarker
              key={`shelter-${idx}`}
              center={[shelter.lat, shelter.lng]}
              radius={9}
              pathOptions={{
                fillColor: "#10b981", // Emerald Green
                fillOpacity: 1,
                color: "#ffffff",
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Evacuation Shelter
                  </h4>
                  <p className="font-semibold text-slate-100 mt-1">{shelter.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Capacity: {shelter.capacity} people</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 7. Emergency Hospitals Layer */}
        {showHospitals &&
          assets.hospitals.map((hospital, idx) => (
            <CircleMarker
              key={`hospital-${idx}`}
              center={[hospital.lat, hospital.lng]}
              radius={9}
              pathOptions={{
                fillColor: "#3b82f6", // Blue
                fillOpacity: 1,
                color: "#ffffff",
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs">
                  <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    Medical Center
                  </h4>
                  <p className="font-semibold text-slate-100 mt-1">{hospital.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Emergency Beds: {hospital.beds}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 8. Critical Infrastructure Assets Layer */}
        {showInfrastructure &&
          assets.infra.map((infra, idx) => (
            <CircleMarker
              key={`infra-${idx}`}
              center={[infra.lat, infra.lng]}
              radius={8}
              pathOptions={{
                fillColor: "#a855f7", // Purple
                fillOpacity: 0.9,
                color: "#ffffff",
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1.5 text-xs">
                  <h4 className="font-bold text-purple-400 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" />
                    Critical Asset
                  </h4>
                  <p className="font-semibold text-slate-100 mt-1">{infra.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Status: {infra.status}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 9. Population Density Grid Layer overlay */}
        {showPopulation &&
          wards.map((ward) => {
            try {
              const geo = JSON.parse(ward.boundaryJson);
              const firstCoord = geo.geometry.coordinates[0][0];
              const centerLon = firstCoord[0];
              const centerLat = firstCoord[1];

              // Render dense red/orange circle representing density center of ward
              const isDense = ward.name.includes("Ward B") || ward.name.includes("Anil Nagar") || ward.name.includes("Velachery");
              
              return (
                <Circle
                  key={`pop-${ward.id}`}
                  center={[centerLat, centerLon]}
                  radius={400}
                  pathOptions={{
                    fillColor: isDense ? "#b91c1c" : "#eab308",
                    fillOpacity: 0.18,
                    color: "transparent",
                    interactive: false
                  }}
                />
              );
            } catch (e) {
              return null;
            }
          })}
      </MapContainer>
    </div>
  );
}
