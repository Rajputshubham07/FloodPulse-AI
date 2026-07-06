import { prisma } from "./db";

interface SimulationResult {
  scenarioName: string;
  rainfallAmount: number;
  simulationHours: number;
  affectedPopulation: number;
  affectedRoadLength: number;
  floodAreaKm2: number;
  polygons: Array<{
    geometry: string; // GeoJSON string
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    waterDepth: number; // in meters
  }>;
}

/**
 * Helper to generate a Leaflet/GeoJSON-compatible octagon polygon coordinate list around a center lat/lon.
 */
function generateOctagonGeoJSON(lat: number, lon: number, radiusMeters: number): string {
  const latDegreeOffset = radiusMeters / 111000;
  const lonDegreeOffset = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const pLat = lat + latDegreeOffset * Math.sin(angle);
    const pLon = lon + lonDegreeOffset * Math.cos(angle);
    points.push([pLon, pLat]); // GeoJSON standard [longitude, latitude]
  }
  points.push(points[0]); // Close the polygon loop

  return JSON.stringify({
    type: "Feature",
    properties: {
      radius: radiusMeters
    },
    geometry: {
      type: "Polygon",
      coordinates: [points]
    }
  });
}

/**
 * Digital Twin Simulation Algorithm.
 * Simulates rainfall accumulation, drainage capacity, water movement and generates dynamic flood boundary polygons.
 */
export async function runDigitalTwinSimulation(
  cityId: string,
  rainfallAmount: number, // in mm/hr
  simulationHours: number  // 0 (current), 3, 6, 12, 24
): Promise<SimulationResult> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: {
      wards: {
        include: { reports: true }
      }
    }
  });

  if (!city) {
    throw new Error(`City with ID ${cityId} not found`);
  }

  const scenarioName = simulationHours === 0 
    ? "Current Conditions" 
    : `${simulationHours}-Hour Simulation (${rainfallAmount} mm/hr Storm)`;

  let totalPopulationAffected = 0;
  let totalRoadLengthAffected = 0; // in km
  let totalFloodArea = 0; // in km2
  const polygons: Array<{ geometry: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; waterDepth: number }> = [];

  for (const ward of city.wards) {
    const activeReports = ward.reports.filter(r => r.status !== "RESOLVED");
    const activeCount = activeReports.length;

    // Ward specific physical variables
    let elevation = 15;
    let drainDensity = 5;
    let populationDensity = 12000; // residents per km2

    if (ward.name.includes("Ward A")) {
      elevation = 4;
      drainDensity = 7;
      populationDensity = 24000;
    } else if (ward.name.includes("Ward B")) {
      elevation = 3;
      drainDensity = 3;
      populationDensity = 28000;
    } else if (ward.name.includes("Velachery")) {
      elevation = 2;
      drainDensity = 2;
      populationDensity = 16000;
    } else if (ward.name.includes("Mahadevapura")) {
      elevation = 15;
      drainDensity = 4;
      populationDensity = 14000;
    } else if (ward.name.includes("Begumpet")) {
      elevation = 10;
      drainDensity = 3;
      populationDensity = 18000;
    } else if (ward.name.includes("Anil Nagar")) {
      elevation = 5;
      drainDensity = 2;
      populationDensity = 20000;
    }

    // Mathematical spread model:
    // Depth builds up with rainfall intensity and duration, modified by local elevation/drainage safety
    const elevationFactor = Math.max(0.2, (40 - elevation) * 0.04);
    const drainageMitigation = drainDensity * 0.08;
    const timeFactor = simulationHours === 0 ? 0.5 : simulationHours;

    const accumulatedWater = rainfallAmount * 0.012 * timeFactor;
    const incidentImpact = activeCount * 0.18;
    
    const waterDepth = Math.max(0, (accumulatedWater + incidentImpact) * elevationFactor - drainageMitigation);

    // Skip generating polygons if there is no water accumulation
    if (waterDepth <= 0.05) continue;

    // Severity mapping
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (waterDepth > 1.2) {
      severity = "CRITICAL";
    } else if (waterDepth > 0.6) {
      severity = "HIGH";
    } else if (waterDepth > 0.25) {
      severity = "MEDIUM";
    }

    // Determine flood radius (in meters) around hotspots
    // Base radius grows with duration and water accumulation
    const radiusMeters = Math.min(
      1500, 
      Math.max(150, waterDepth * 400 + (simulationHours * 45))
    );

    // Calculate flooded area for this polygon
    const polygonAreaKm2 = (Math.PI * Math.pow(radiusMeters, 2)) / 1000000;
    totalFloodArea += polygonAreaKm2;

    // Calculate impacted metrics
    totalPopulationAffected += Math.round(polygonAreaKm2 * populationDensity * (waterDepth > 0.8 ? 0.95 : 0.45));
    totalRoadLengthAffected += Math.round((polygonAreaKm2 * 6.5 * (simulationHours + 1)) * 10) / 10;

    // Generate coordinates center (defaults to ward center or center of reports)
    let centerLat = city.latitude;
    let centerLon = city.longitude;

    if (activeCount > 0) {
      // center around active reports
      centerLat = activeReports.reduce((sum, r) => sum + r.latitude, 0) / activeCount;
      centerLon = activeReports.reduce((sum, r) => sum + r.longitude, 0) / activeCount;
    } else {
      // extract from boundary coordinates as fallback
      try {
        const geo = JSON.parse(ward.boundaryJson);
        const firstCoord = geo.geometry.coordinates[0][0];
        centerLon = firstCoord[0];
        centerLat = firstCoord[1];
      } catch (e) {
        // fallback to city coords + slight random noise
        centerLat = city.latitude + (Math.random() - 0.5) * 0.02;
        centerLon = city.longitude + (Math.random() - 0.5) * 0.02;
      }
    }

    const geojsonStr = generateOctagonGeoJSON(centerLat, centerLon, radiusMeters);

    polygons.push({
      geometry: geojsonStr,
      severity,
      waterDepth
    });
  }

  // Create scenario record in the database
  console.log(`[Digital Twin] Saving Digital Twin Scenario: "${scenarioName}"...`);
  const scenario = await prisma.digitalTwinScenario.create({
    data: {
      cityId,
      scenarioName,
      rainfallAmount,
      simulationHours,
      affectedPopulation: totalPopulationAffected,
      affectedRoadLength: totalRoadLengthAffected,
      floodAreaKm2: Math.round(totalFloodArea * 100) / 100
    }
  });

  // Save polygon structures
  for (const poly of polygons) {
    await prisma.floodPolygon.create({
      data: {
        scenarioId: scenario.id,
        geometry: poly.geometry,
        severity: poly.severity,
        waterDepth: poly.waterDepth
      }
    });
  }

  return {
    scenarioName,
    rainfallAmount,
    simulationHours,
    affectedPopulation: totalPopulationAffected,
    affectedRoadLength: totalRoadLengthAffected,
    floodAreaKm2: Math.round(totalFloodArea * 100) / 100,
    polygons
  };
}
