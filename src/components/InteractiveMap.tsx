"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap, useMapEvents, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import { Search, Compass, Loader2, X } from "lucide-react";

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
  ],
  "Hyderabad": [
    [17.495, 78.360],
    [17.520, 78.490],
    [17.430, 78.580],
    [17.350, 78.580],
    [17.310, 78.500],
    [17.320, 78.410],
    [17.410, 78.320],
    [17.495, 78.360]
  ],
  "Guwahati": [
    [26.13, 91.70],
    [26.13, 91.80],
    [26.16, 91.83],
    [26.20, 91.83],
    [26.23, 91.80],
    [26.23, 91.70],
    [26.20, 91.67],
    [26.16, 91.67],
    [26.13, 91.70]
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

// Component to capture map clicks and manual zoom/move events
function MapEventsHandler({ 
  onMapClick, 
  onViewportChange 
}: { 
  onMapClick?: (lat: number, lng: number) => void;
  onViewportChange: (center: [number, number], zoom: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    zoomend(e) {
      const map = e.target;
      const center = map.getCenter();
      onViewportChange([center.lat, center.lng], map.getZoom());
    },
    moveend(e) {
      const map = e.target;
      const center = map.getCenter();
      onViewportChange([center.lat, center.lng], map.getZoom());
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
  const [predictionWindow, setPredictionWindow] = useState<"current" | "3h" | "6h" | "12h" | "24h">("current");
  const prevCityIdRef = useRef<string>("");

  // Nominatim Search & Geolocation States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSearchResults(data);
          }
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("Nominatim search error:", err);
          setIsSearching(false);
        });
    }, 600);
  };

  const handleSelectLocation = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setMapCenter([lat, lon]);
      setMapZoom(15);
      setSearchResults([]);
      setSearchQuery(result.display_name);
    }
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        setMapZoom(15);
        setLocatingUser(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location.");
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Set center to selected incident if specified
  useEffect(() => {
    if (selectedIncident) {
      setMapCenter([selectedIncident.latitude, selectedIncident.longitude]);
      setMapZoom(16);
    }
  }, [selectedIncident]);

  // Set center to active city center when it changes (only on actual city ID change)
  useEffect(() => {
    const activeCityId = wards[0]?.city?.id;
    if (activeCityId && activeCityId !== prevCityIdRef.current) {
      prevCityIdRef.current = activeCityId;
      if (cityCenter) {
        setMapCenter(cityCenter);
        setMapZoom(cityZoom || 12);
      } else if (wards.length > 0 && wards[0]?.city) {
        const city = wards[0].city;
        setMapCenter([city.latitude, city.longitude]);
        setMapZoom(city.zoomLevel || 12);
      }
    }
  }, [cityCenter, cityZoom, wards]);

  const activeCityName = wards[0]?.city?.name || "Mumbai";
  const cityLimits = CITY_OUTER_LIMITS[activeCityName] || CITY_OUTER_LIMITS["Mumbai"];

  // Simple client-side clustering algorithm based on current zoom level
  const activeIncidents = incidents.filter(inc => inc.status !== "RESOLVED");
  const clusteredIncidents = (() => {
    // scale factor for distance checking: larger distance when zoomed out
    const threshold = 0.08 / Math.pow(2, Math.max(1, mapZoom - 11)); 
    const clusters: any[] = [];

    activeIncidents.forEach((incident) => {
      let found = false;
      for (const cluster of clusters) {
        const distLat = Math.abs(cluster.latitude - incident.latitude);
        const distLng = Math.abs(cluster.longitude - incident.longitude);
        if (distLat < threshold && distLng < threshold) {
          cluster.incidents.push(incident);
          // Update centroid coordinates
          cluster.latitude = (cluster.latitude * (cluster.incidents.length - 1) + incident.latitude) / cluster.incidents.length;
          cluster.longitude = (cluster.longitude * (cluster.incidents.length - 1) + incident.longitude) / cluster.incidents.length;
          // Upgrade severity if higher
          const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
          if (severities.indexOf(incident.severity) > severities.indexOf(cluster.severity)) {
            cluster.severity = incident.severity;
          }
          found = true;
          break;
        }
      }

      if (!found) {
        clusters.push({
          id: `cluster-${incident.id}`,
          latitude: incident.latitude,
          longitude: incident.longitude,
          severity: incident.severity,
          incidents: [incident]
        });
      }
    });

    return clusters;
  })();

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        style={{ background: "#090d16" }}
      >
        <MapViewUpdater center={mapCenter} zoom={mapZoom} />
        
        {/* Esri World Imagery (Satellite) base layer */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        />

        {/* Esri World Boundaries and Places (Hybrid Labels & Roads) overlay layer */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution='Labels &copy; Esri'
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

        {/* Dynamic event handler for pinning incident reports and tracking manual zoom/move */}
        <MapEventsHandler 
          onMapClick={onMapClick} 
          onViewportChange={(center, zoom) => {
            setMapCenter(center);
            setMapZoom(zoom);
          }} 
        />

        {/* 1. Ward Boundaries & Prediction Heatmap */}
        {predictionWindow !== "current" && wards.map((ward) => {
          try {
            const geojson = JSON.parse(ward.boundaryJson);
            const rawCoords = geojson.geometry.coordinates[0];
            const leafletCoords = rawCoords.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

            // Find matching prediction
            const prediction = ward.predictions?.find((p: any) => p.predictionWindow === predictionWindow);
            if (!prediction) return null;

            const color = getRiskColor(prediction.severity);

            // Suggested actions based on severity
            let suggestedActions = "Normal operations. Monitor weather updates.";
            if (prediction.severity === "CRITICAL") {
              suggestedActions = "IMMEDIATE EVACUATION ADVISED. Place sandbags, deploy emergency pumps, move vehicles to elevated ground.";
            } else if (prediction.severity === "HIGH") {
              suggestedActions = "Pre-stage rescue crews, avoid low-lying underpasses, prepare flood barriers.";
            } else if (prediction.severity === "MEDIUM") {
              suggestedActions = "Clear local drain inlets, monitor rising channels, secure loose equipment.";
            }

            return (
              <Polygon
                key={`heatmap-${ward.id}`}
                positions={leafletCoords}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: prediction.severity === "CRITICAL" ? 0.35 : prediction.severity === "HIGH" ? 0.25 : prediction.severity === "MEDIUM" ? 0.15 : 0.05,
                  color: color,
                  weight: 1.5,
                  dashArray: "3, 6"
                }}
              >
                <Popup>
                  <div className="p-2 max-w-[260px] text-xs">
                    <div className="flex flex-col gap-2">
                      <div className="border-b border-slate-800 pb-2">
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">AI Predictive Forecast ({predictionWindow})</p>
                        <h4 className="font-bold text-slate-100 mt-0.5">{ward.name}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                          <p className="text-slate-400 text-[9px]">Probability</p>
                          <p className="font-bold text-slate-200 mt-0.5">{prediction.probability}%</p>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                          <p className="text-slate-400 text-[9px]">Severity</p>
                          <p className="font-bold mt-0.5" style={{ color }}>{prediction.severity}</p>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                          <p className="text-slate-400 text-[9px]">Confidence</p>
                          <p className="font-bold text-slate-200 mt-0.5">{prediction.confidence}%</p>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                          <p className="text-slate-400 text-[9px]">Risk Trend</p>
                          <p className="font-bold text-slate-200 mt-0.5">{prediction.probability > 60 ? "Rising 📈" : "Stable ➡️"}</p>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800 text-[11px] leading-relaxed text-slate-300">
                        <p className="font-semibold text-slate-200 text-[9px] uppercase tracking-wider mb-0.5">XGBoost Reasoning</p>
                        {prediction.reasoning}
                      </div>

                      <div className="bg-amber-950/20 p-2 rounded border border-amber-900/30 text-[11px] leading-relaxed text-amber-200">
                        <p className="font-semibold text-amber-400 text-[9px] uppercase tracking-wider mb-0.5">Suggested Action</p>
                        {suggestedActions}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          } catch (e) {
            console.error("Failed to render predictive heatmap polygon:", e);
            return null;
          }
        })}

        {/* 2. Alert Zones (Dashed circles around active incidents) */}
        {incidents
          .filter(inc => inc.status !== "RESOLVED")
          .map((incident) => {
            const incidentWard = wards.find(w => w.id === incident.wardId);
            return (
              <Circle
                key={`zone-${incident.id}`}
                center={[incident.latitude, incident.longitude]}
                radius={600} // Less radius around the alert dot
                pathOptions={{
                  fillColor: getSeverityColor(incident.severity),
                  fillOpacity: incident.severity === "CRITICAL" ? 0.25 : incident.severity === "HIGH" ? 0.18 : 0.1,
                  color: getSeverityColor(incident.severity),
                  weight: 2,
                  dashArray: "4, 6"
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
                  <div className="p-1.5 max-w-[260px] text-xs">
                    <div className="flex flex-col gap-2">
                      {/* Ward / Zone Risk Details */}
                      {incidentWard && (
                        <div className="border-b border-slate-800 pb-2 mb-1">
                          <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Zone Area Risk Info</p>
                          <h4 className="font-bold text-slate-100 mt-0.5">{incidentWard.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" 
                                  style={{ backgroundColor: `${getRiskColor(incidentWard.riskLevel)}20`, color: getRiskColor(incidentWard.riskLevel) }}>
                              Risk: {incidentWard.riskLevel}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300">
                              Score: {incidentWard.riskScore}%
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Incident / Alert Details */}
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Active Alert Info</p>
                        <div className="flex justify-between items-center gap-2 mt-1 mb-1.5">
                          <span className="font-bold text-[10px] px-2 py-0.5 rounded-full" 
                                style={{ backgroundColor: `${getSeverityColor(incident.severity)}20`, color: getSeverityColor(incident.severity) }}>
                            {incident.severity}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{incident.status}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-100 line-clamp-3 mb-1.5 leading-relaxed">{incident.description}</p>
                        <div className="flex flex-col gap-0.5 border-t border-slate-800 pt-1.5 text-[10px] text-slate-400">
                          <p>AI Assessment: <span className="text-slate-300 font-medium">{incident.aiLabel}</span></p>
                          <p>Confidence: <span className="text-slate-300 font-medium">{Math.round(incident.aiConfidence * 100)}%</span></p>
                          {incident.reporterName && <p>Reporter: <span className="text-slate-300 font-medium">{incident.reporterName}</span></p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* 2. Active Incidents (Markers with Clustering & Premium Cards) */}
        {clusteredIncidents.map((cluster) => {
          const isCluster = cluster.incidents.length > 1;
          const mainIncident = cluster.incidents[0];

          return (
            <CircleMarker
              key={cluster.id}
              center={[cluster.latitude, cluster.longitude]}
              radius={isCluster ? 14 : (cluster.severity === "CRITICAL" ? 10 : 8)}
              pathOptions={{
                fillColor: getSeverityColor(cluster.severity),
                fillOpacity: isCluster ? 0.95 : 0.85,
                color: isCluster ? "#ffffff" : "#ffffff",
                weight: isCluster ? 3.0 : 1.5,
              }}
              eventHandlers={{
                click: () => {
                  if (!isCluster && onSelectIncident) {
                    onSelectIncident(mainIncident);
                  }
                }
              }}
            >
              <Popup>
                <div className="p-1.5 max-w-[240px] text-xs">
                  {isCluster ? (
                    <div>
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-2">
                        <span className="font-bold text-slate-100">{cluster.incidents.length} Incidents Clustered</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" 
                              style={{ backgroundColor: `${getSeverityColor(cluster.severity)}20`, color: getSeverityColor(cluster.severity) }}>
                          Max: {cluster.severity}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {cluster.incidents.map((inc: any) => (
                          <div key={inc.id} className="text-[11px] text-slate-300 border-l-2 pl-2" style={{ borderColor: getSeverityColor(inc.severity) }}>
                            <p className="font-semibold text-slate-200 line-clamp-1">{inc.description}</p>
                            <p className="text-[9px] text-slate-500">{inc.aiLabel} &bull; {inc.status}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-2 text-center border-t border-slate-800 pt-1.5 font-medium">Zoom in to separate these reports</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center gap-2 mb-1.5">
                        <span className="font-bold text-[10px] px-2 py-0.5 rounded-full" 
                              style={{ backgroundColor: `${getSeverityColor(mainIncident.severity)}20`, color: getSeverityColor(mainIncident.severity) }}>
                          {mainIncident.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{mainIncident.status}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-100 line-clamp-3 mb-1.5 leading-relaxed">{mainIncident.description}</p>
                      <div className="flex flex-col gap-0.5 border-t border-slate-800 pt-1.5 text-[10px] text-slate-400">
                        <p>AI Assessment: <span className="text-slate-300 font-medium">{mainIncident.aiLabel}</span></p>
                        <p>Confidence: <span className="text-slate-300 font-medium">{Math.round(mainIncident.aiConfidence * 100)}%</span></p>
                        {mainIncident.reporterName && <p>Reporter: <span className="text-slate-300 font-medium">{mainIncident.reporterName}</span></p>}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 3. Temporary Citizen Selection Pin & Alert Zone */}
        {reportCoordinates && (
          <>
            <Circle
              center={reportCoordinates}
              radius={600}
              pathOptions={{
                fillColor: "#10b981", // Emerald
                fillOpacity: 0.15,
                color: "#10b981",
                weight: 2,
                dashArray: "4, 6",
                interactive: false
              }}
            />
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
          </>
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

        {/* 5. User live location marker */}
        {userLocation && (
          <CircleMarker
            center={userLocation}
            radius={8}
            pathOptions={{
              fillColor: "#3b82f6", // Blue glow for live user position
              fillOpacity: 1,
              color: "#ffffff",
              weight: 2
            }}
          >
            <Popup>
              <div className="p-1">
                <p className="text-xs font-bold text-blue-400">Your Current Location</p>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Floating Map Controls & Search Panel */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 w-80 pointer-events-auto">
        {/* Search Bar */}
        <div className="relative glass-panel rounded-lg overflow-hidden shadow-lg border border-slate-700 flex items-center px-3 py-2 bg-slate-900/90 backdrop-blur-md">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search location, address, landmark..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-transparent border-none text-slate-200 placeholder-slate-400 text-xs focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="text-slate-400 hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSearching && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin ml-1" />}
        </div>

        {/* Autocomplete Results Panel */}
        {searchResults.length > 0 && (
          <div className="glass-panel max-h-60 overflow-y-auto rounded-lg shadow-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md flex flex-col divide-y divide-slate-800 text-xs">
            {searchResults.map((result: any) => (
              <button
                key={result.place_id}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 transition-colors text-slate-300 hover:text-white line-clamp-2"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geolocation Floating Button */}
      <button
        onClick={handleLocateUser}
        title="Locate Me"
        className="absolute top-4 right-4 z-[1000] p-2.5 rounded-lg glass-panel bg-slate-900/90 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 shadow-lg transition-all pointer-events-auto flex items-center justify-center"
      >
        <Compass className={`w-5 h-5 ${locatingUser ? "animate-spin text-emerald-400" : ""}`} />
      </button>

      {/* Floating Timeline & Prediction Mode Selector */}
      <div className="absolute bottom-4 right-4 z-[1000] glass-panel bg-slate-900/90 border border-slate-700 p-1.5 rounded-lg shadow-lg flex items-center gap-1.5 pointer-events-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">Mode:</span>
        <div className="flex bg-slate-950/80 p-0.5 rounded-md border border-slate-800/80 text-[10px] font-medium text-slate-300">
          {(["current", "3h", "6h", "12h", "24h"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPredictionWindow(mode)}
              className={`px-2 py-1 rounded transition-colors ${
                predictionWindow === mode
                  ? "bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold"
                  : "hover:bg-slate-900 hover:text-white"
              }`}
            >
              {mode === "current" ? "Live Map" : `${mode} Forecast`}
            </button>
          ))}
        </div>
      </div>

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
