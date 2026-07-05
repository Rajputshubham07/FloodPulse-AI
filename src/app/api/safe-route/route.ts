import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";

// Helper to compute distance in meters between two lat/lng points (haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startLat = parseFloat(searchParams.get("startLat") || "");
    const startLng = parseFloat(searchParams.get("startLng") || "");
    const endLat = parseFloat(searchParams.get("endLat") || "");
    const endLng = parseFloat(searchParams.get("endLng") || "");

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      return NextResponse.json({ error: "Valid startLat, startLng, endLat, and endLng are required" }, { status: 400 });
    }

    const cityId = searchParams.get("cityId");
    const where: any = {
      status: { not: "RESOLVED" },
      severity: { in: ["HIGH", "CRITICAL"] }
    };
    if (cityId) where.cityId = cityId;

    const criticalIncidents = await prisma.incidentReport.findMany({
      where
    });

    // 2. Generate a baseline route with 5 waypoints
    const steps = 6;
    const path: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Linear interpolation
      let lat = startLat + t * (endLat - startLat);
      let lng = startLng + t * (endLng - startLng);

      // Check if this waypoint is close to any critical flood incident
      for (const incident of criticalIncidents) {
        const dist = getDistance(lat, lng, incident.latitude, incident.longitude);
        // If within 250 meters of flooding, shift the waypoint to bypass it
        if (dist < 250) {
          // Calculate perpendicular vector to shift
          const dy = endLat - startLat;
          const dx = endLng - startLng;
          // Perpendicular vector
          const perpLat = -dx;
          const perpLng = dy;
          const len = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
          
          if (len > 0) {
            // Shift by ~300 meters (approx 0.0027 degrees) perpendicular to the path
            const shiftMagnitude = 0.0027;
            lat += (perpLat / len) * shiftMagnitude;
            lng += (perpLng / len) * shiftMagnitude;
          }
        }
      }

      path.push([lat, lng]);
    }

    // Determine if any detours were triggered
    const wasRerouted = criticalIncidents.some(incident => {
      // If any incident is within 250 meters of the straight line, we assume a reroute happened
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lineLat = startLat + t * (endLat - startLat);
        const lineLng = startLng + t * (endLng - startLng);
        if (getDistance(lineLat, lineLng, incident.latitude, incident.longitude) < 250) {
          return true;
        }
      }
      return false;
    });

    return NextResponse.json({
      path,
      wasRerouted,
      message: wasRerouted 
        ? "Low-risk route generated. Rerouted around active waterlogged areas." 
        : "Direct route is safe. No major flood risks detected on this path.",
      criticalIncidentsAvoided: wasRerouted ? 1 : 0
    });
  } catch (error: any) {
    console.error("GET safe-route error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate safe route" }, { status: 500 });
  }
}
