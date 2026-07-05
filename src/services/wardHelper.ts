import { prisma } from "./db";
import { calculateRiskScore } from "./riskEngine";

/**
 * Ray-casting algorithm to determine if a GPS coordinate is inside a GeoJSON polygon boundary.
 */
export function isPointInPolygon(latitude: number, longitude: number, polygonCoordinates: number[][][]) {
  const x = longitude;
  const y = latitude;
  let inside = false;

  for (const ring of polygonCoordinates) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  }

  return inside;
}

/**
 * Determines which ward a coordinate belongs to.
 * Automatically switches between PostGIS raw queries (if PostgreSQL is configured)
 * and Ray-casting JS calculations (for local SQLite development).
 */
export async function findWardForCoordinate(latitude: number, longitude: number): Promise<string | null> {
  const isPostgres = process.env.DATABASE_URL?.startsWith("postgres") || false;

  if (isPostgres) {
    console.log(`[Geospatial Layer] Executing PostGIS ST_Contains query for coordinate: (${latitude}, ${longitude})`);
    try {
      // In PostGIS, we parse the stored JSON boundary using ST_GeomFromGeoJSON and verify inclusion
      const result = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Ward" 
        WHERE ST_Contains(
          ST_SetSRID(ST_GeomFromGeoJSON(boundaryJson), 4326), 
          ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326)
        ) 
        LIMIT 1;
      `;
      if (result && result.length > 0) {
        return result[0].id;
      }
    } catch (err) {
      console.warn("[Geospatial Layer] PostGIS ST_Contains query failed, falling back to JS math.", err);
    }
  }

  // Fallback / SQLite mode: Ray-casting
  const wards = await prisma.ward.findMany();
  for (const ward of wards) {
    try {
      const geojson = JSON.parse(ward.boundaryJson);
      const coordinates = geojson.geometry.coordinates;

      if (geojson.geometry.type === "Polygon") {
        if (isPointInPolygon(latitude, longitude, coordinates)) {
          return ward.id;
        }
      }
    } catch (e) {
      console.error(`Error parsing geojson for ward ${ward.name}:`, e);
    }
  }

  return null;
}

/**
 * Recalculates and updates the risk score of a ward.
 */
export async function updateWardRiskScore(wardId: string, currentRainfall: number = 25) {
  const ward = await prisma.ward.findUnique({
    where: { id: wardId },
    include: { reports: true }
  });

  if (!ward) return;

  // Static attributes for simulation based on ward name
  let elevation = 20; // default meters
  let proximityToWater = 500; // default meters
  let historicalFrequency = 5; // default incidents

  if (ward.name.includes("Downtown")) {
    elevation = 15;
    proximityToWater = 300;
    historicalFrequency = 5;
  } else if (ward.name.includes("Riverfront")) {
    elevation = 5;
    proximityToWater = 50;
    historicalFrequency = 12;
  } else if (ward.name.includes("Industrial")) {
    elevation = 8;
    proximityToWater = 150;
    historicalFrequency = 8;
  } else if (ward.name.includes("West")) {
    elevation = 45;
    proximityToWater = 800;
    historicalFrequency = 2;
  }

  // Count active incidents in this ward
  const activeReportCount = ward.reports.filter(r => r.status !== "RESOLVED").length;

  const { score, level } = calculateRiskScore({
    rainfall: currentRainfall,
    elevation,
    proximityToWater,
    reportCount: activeReportCount,
    historicalFrequency
  });

  await prisma.ward.update({
    where: { id: wardId },
    data: {
      riskScore: score,
      riskLevel: level,
      lastUpdated: new Date()
    }
  });
}
