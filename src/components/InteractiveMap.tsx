"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap, useMapEvents, Polyline } from "react-leaflet";
import L from "leaflet";

// Fix default leaflet icon issues by using custom circles/HTML or SVG icons
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return "#ef4444"; // Red
    case "HIGH":
      return "#f97316"; // Orange
    case "MEDIUM":
      return "#eab308"; // Yellow
    default:
      return "#3b82f6"; // Blue
  }
};

const getRiskColor = (level: string) => {
  switch (level) {
    case "CRITICAL":
      return "#ef4444";
    case "HIGH":
      return "#f97316";
    case "MEDIUM":
      return "#eab308";
    default:
      return "#22c55e"; // Green
  }
};

const CITY_OUTER_LIMITS: Record<string, [number, number][]> = {
  "Mumbai": [
    [18.895, 72.805],
    [18.895, 72.845],
    [18.940, 72.855],
    [18.970, 72.850],
    [18.970, 72.820],
    [18.950, 72.805],
    [18.910, 72.800],
    [18.895, 72.805]
  ],
  "Bengaluru": [
    [12.86, 77.54],
    [12.86, 77.68],
    [12.93, 77.74],
    [13.04, 77.74],
    [13.07, 77.66],
    [13.07, 77.53],
    [12.98, 77.49],
    [12.90, 77.49],
    [12.86, 77.54]
  ],
  "Chennai": [
    [12.95, 80.18],
    [12.95, 80.26],
    [13.02, 80.28],
    [13.08, 80.28],
    [13.12, 80.25],
    [13.12, 80.20],
    [13.05, 80.18],
    [12.95, 80.18]
  ]
};

// Component to dynamically adjust map view when a selected incident changes
function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Component to capture map clicks and report coordinate selection
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

interface InteractiveMapProps {
  wards: any[];
  incidents: any[];
  selectedIncident?: any;
  onSelectIncident?: (incident: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
  reportCoordinates?: [number, number] | null;
  safeRoutePath?: [number, number][];
  cityCenter?: [number, number];
  cityZoom?: number;
}

export default function InteractiveMap({
  wards,
  incidents,
  selectedIncident,
  onSelectIncident,
  onMapClick,
  reportCoordinates,
  safeRoutePath,
  cityCenter,
  cityZoom
}: InteractiveMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.93, 72.83]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Set center to selected incident if specified
  useEffect(() => {
    if (selectedIncident) {
      setMapCenter([selectedIncident.latitude, selectedIncident.longitude]);
      setMapZoom(16);
    }
  }, [selectedIncident]);

  // Set center to active city center when it changes
  useEffect(() => {
    if (cityCenter) {
      setMapCenter(cityCenter);
      setMapZoom(cityZoom || 12);
    } else if (wards.length > 0 && wards[0]?.city) {
      const city = wards[0].city;
      setMapCenter([city.latitude, city.longitude]);
      setMapZoom(city.zoomLevel || 12);
    }
  }, [cityCenter, cityZoom, wards]);

  const activeCityName = wards[0]?.city?.name || "Mumbai";
  const cityLimits = CITY_OUTER_LIMITS[activeCityName] || CITY_OUTER_LIMITS["Mumbai"];

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        style={{ background: "#090d16" }}
      >
        <MapViewUpdater center={mapCenter} zoom={mapZoom} />
        
        {/* Esri World Imagery satellite tile layer */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        />

        {/* Dynamic City Limits Outer Boundary */}
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

        {/* Dynamic click handler for pinning incident reports */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* 1. Ward Boundaries (Polygons) */}
        {wards.map((ward) => {
          try {
            const geojson = JSON.parse(ward.boundaryJson);
            // Leaflet Polygon expects coordinates as [lat, lng], but GeoJSON is [lng, lat]
            const rawCoords = geojson.geometry.coordinates[0];
            const leafletCoords = rawCoords.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

            return (
              <Polygon
                key={ward.id}
                positions={leafletCoords}
                pathOptions={{
                  fillColor: getRiskColor(ward.riskLevel),
                  fillOpacity: ward.riskLevel === "CRITICAL" ? 0.35 : ward.riskLevel === "HIGH" ? 0.25 : ward.riskLevel === "MEDIUM" ? 0.15 : 0.05,
                  color: getRiskColor(ward.riskLevel),
                  weight: 2,
                  dashArray: "3, 6"
                }}
              >
                <Popup>
                  <div className="p-1">
                    <h3 className="font-bold text-slate-100 text-sm">{ward.name}</h3>
                    <p className="text-xs mt-1 text-slate-300">
                      Risk Score: <span className="font-semibold" style={{ color: getRiskColor(ward.riskLevel) }}>{ward.riskScore}%</span>
                    </p>
                    <p className="text-xs text-slate-400">Risk Level: {ward.riskLevel}</p>
                    <p className="text-xs text-slate-400 mt-1">Active incidents: {ward.reports?.length || 0}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          } catch (e) {
            console.error("Failed to render ward boundary:", e);
            return null;
          }
        })}

        {/* 2. Active Incidents (Markers) */}
        {incidents
          .filter(inc => inc.status !== "RESOLVED")
          .map((incident) => (
            <CircleMarker
              key={incident.id}
              center={[incident.latitude, incident.longitude]}
              radius={incident.severity === "CRITICAL" ? 10 : 8}
              pathOptions={{
                fillColor: getSeverityColor(incident.severity),
                fillOpacity: 0.85,
                color: "#ffffff",
                weight: 1.5,
              }}
              eventHandlers={{
                click: () => {
                  if (onSelectIncident) {
                    onSelectIncident(incident);
                  }
                }
              }}
            >
              <Popup>
                <div className="p-1 max-w-[200px]">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-xs px-2 py-0.5 rounded-full" 
                          style={{ backgroundColor: `${getSeverityColor(incident.severity)}20`, color: getSeverityColor(incident.severity) }}>
                      {incident.severity}
                    </span>
                    <span className="text-[10px] text-slate-400">{incident.status}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mt-1.5 line-clamp-2">{incident.description}</p>
                  <p className="text-[10px] text-slate-500 mt-1">AI Match: {incident.aiLabel} ({Math.round(incident.aiConfidence * 100)}%)</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* 3. Temporary Citizen Selection Pin */}
        {reportCoordinates && (
          <CircleMarker
            center={reportCoordinates}
            radius={9}
            pathOptions={{
              fillColor: "#10b981", // Emerald
              fillOpacity: 1,
              color: "#ffffff",
              weight: 2
            }}
          >
            <Popup>
              <div className="p-1">
                <p className="text-xs font-bold text-emerald-400">Selected Reporting Point</p>
                <p className="text-[10px] text-slate-400">Coordinates: {reportCoordinates[0].toFixed(5)}, {reportCoordinates[1].toFixed(5)}</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* 4. Safe Route Path (Polyline) */}
        {safeRoutePath && safeRoutePath.length > 0 && (
          <Polyline
            positions={safeRoutePath}
            pathOptions={{
              color: "#10b981", // Emerald green for safe route
              weight: 6,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
              dashArray: "1, 10" // Glowing dot effect
            }}
          />
        )}
      </MapContainer>

      {/* Map Legend Floating Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] glass-panel px-3 py-2.5 rounded-lg text-xs flex flex-col gap-1.5 shadow-lg border border-slate-700 pointer-events-auto">
        <h4 className="font-semibold text-slate-200 mb-0.5">Flood Risk Levels</h4>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span>Critical Risk</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#f97316]" />
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#eab308]" />
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
          <span>Low Risk</span>
        </div>
      </div>
    </div>
  );
}
