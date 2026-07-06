import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { generateForecastsForCity } from "../src/services/floodPredictionEngine";
import { runDigitalTwinSimulation } from "../src/services/digitalTwinEngine";
import { runSatelliteFloodAnalysis } from "../src/services/satelliteFloodService";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const mockCities = [
  {
    name: "Mumbai",
    latitude: 18.930,
    longitude: 72.830,
    zoomLevel: 13,
    readinessScore: 82.0,
    riskScore: 78.4,
    riskLevel: "HIGH",
    description: "Coastal megacity highly vulnerable to heavy monsoons and high tide drainage blocks in South Mumbai."
  },
  {
    name: "Bengaluru",
    latitude: 12.9716,
    longitude: 77.5946,
    zoomLevel: 11,
    readinessScore: 74.0,
    riskScore: 68.5,
    riskLevel: "HIGH",
    description: "Inland plateau experiencing rapid urbanization and stormwater channel overflows near Bellandur lake basin."
  },
  {
    name: "Chennai",
    latitude: 13.0827,
    longitude: 80.2707,
    zoomLevel: 12,
    readinessScore: 68.0,
    riskScore: 84.5,
    riskLevel: "CRITICAL",
    description: "Low-lying coastal city highly vulnerable to cyclone precipitation and velachery underpass waterlogging."
  },
  {
    name: "Hyderabad",
    latitude: 17.3850,
    longitude: 78.4867,
    zoomLevel: 12,
    readinessScore: 79.5,
    riskScore: 62.0,
    riskLevel: "MEDIUM",
    description: "Inland historic city prone to urban waterlogging and drainage overflows in low-lying areas during sudden cloudbursts."
  },
  {
    name: "Guwahati",
    latitude: 26.1445,
    longitude: 91.7362,
    zoomLevel: 12,
    readinessScore: 65.0,
    riskScore: 88.2,
    riskLevel: "CRITICAL",
    description: "Riverine city along the Brahmaputra highly susceptible to flash floods, landslides, and seasonal monsoonal inundation."
  }
];

const mockWards = [
  // Mumbai Wards
  {
    cityName: "Mumbai",
    name: "Mumbai - Ward A: Colaba / Fort / Churchgate",
    riskScore: 68.5,
    riskLevel: "HIGH",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [72.805, 18.895],
          [72.845, 18.895],
          [72.845, 18.940],
          [72.805, 18.940],
          [72.805, 18.895]
        ]]
      }
    })
  },
  {
    cityName: "Mumbai",
    name: "Mumbai - Ward B: Crawford Market",
    riskScore: 84.0,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [72.820, 18.940],
          [72.848, 18.940],
          [72.848, 18.968],
          [72.820, 18.968],
          [72.820, 18.940]
        ]]
      }
    })
  },
  // Bengaluru Wards
  {
    cityName: "Bengaluru",
    name: "Bengaluru - Mahadevapura (IT Corridor)",
    riskScore: 84.5,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.660, 12.960],
          [77.720, 12.960],
          [77.720, 13.030],
          [77.660, 13.030],
          [77.660, 12.960]
        ]]
      }
    })
  },
  {
    cityName: "Bengaluru",
    name: "Bengaluru - Bommanahalli (South-East)",
    riskScore: 72.0,
    riskLevel: "HIGH",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.600, 12.870],
          [77.655, 12.870],
          [77.655, 12.940],
          [77.600, 12.940],
          [77.600, 12.870]
        ]]
      }
    })
  },
  // Chennai Wards
  {
    cityName: "Chennai",
    name: "Chennai - Velachery (Lake Basin)",
    riskScore: 88.0,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.200, 12.960],
          [80.250, 12.960],
          [80.250, 13.000],
          [80.200, 13.000],
          [80.200, 12.960]
        ]]
      }
    })
  },
  {
    cityName: "Chennai",
    name: "Chennai - T-Nagar (Commercial)",
    riskScore: 65.4,
    riskLevel: "HIGH",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.210, 13.020],
          [80.250, 13.020],
          [80.250, 13.060],
          [80.210, 13.060],
          [80.210, 13.020]
        ]]
      }
    })
  },
  // Hyderabad Wards
  {
    cityName: "Hyderabad",
    name: "Hyderabad - Begumpet (Low-Lying Area)",
    riskScore: 78.0,
    riskLevel: "HIGH",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [78.450, 17.430],
          [78.490, 17.430],
          [78.490, 17.460],
          [78.450, 17.460],
          [78.450, 17.430]
        ]]
      }
    })
  },
  {
    cityName: "Hyderabad",
    name: "Hyderabad - Khairatabad (Central)",
    riskScore: 58.5,
    riskLevel: "MEDIUM",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [78.440, 17.390],
          [78.480, 17.390],
          [78.480, 17.425],
          [78.440, 17.425],
          [78.440, 17.390]
        ]]
      }
    })
  },
  // Guwahati Wards
  {
    cityName: "Guwahati",
    name: "Guwahati - Zoo Road (Commercial)",
    riskScore: 92.0,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [91.760, 26.145],
          [91.800, 26.145],
          [91.800, 26.175],
          [91.760, 26.175],
          [91.760, 26.145]
        ]]
      }
    })
  },
  {
    cityName: "Guwahati",
    name: "Guwahati - Anil Nagar (Inundation Zone)",
    riskScore: 94.5,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [91.740, 26.160],
          [91.780, 26.160],
          [91.780, 26.190],
          [91.740, 26.190],
          [91.740, 26.160]
        ]]
      }
    })
  }
];

const mockIncidents = [
  // Mumbai
  {
    cityName: "Mumbai",
    wardName: "Mumbai - Ward B: Crawford Market",
    reporterName: "Amit Shah",
    reporterPhone: "+919811223344",
    latitude: 18.948,
    longitude: 72.834,
    description: "Crawford Market junction flooded. Water accumulation near old gates. Storm drainage completely choked with waste.",
    aiLabel: "BLOCKED_DRAIN",
    aiConfidence: 0.95,
    severity: "HIGH",
    status: "INVESTIGATING",
    assignedTo: "MCGM Stormwater Drainage Dept"
  },
  {
    cityName: "Mumbai",
    wardName: "Mumbai - Ward A: Colaba / Fort / Churchgate",
    reporterName: "Sunita Deshmukh",
    reporterPhone: "+919822334455",
    latitude: 18.932,
    longitude: 72.827,
    description: "Churchgate station subway entrance flooded. Heavy water accumulation makes walking impossible.",
    aiLabel: "FLOODED_ROAD",
    aiConfidence: 0.97,
    severity: "CRITICAL",
    status: "DISPATCHED",
    assignedTo: "Mumbai Disaster Response Squad A"
  },
  // Bengaluru
  {
    cityName: "Bengaluru",
    wardName: "Bengaluru - Mahadevapura (IT Corridor)",
    reporterName: "Rajesh Kumar",
    reporterPhone: "+919876543210",
    latitude: 12.928,
    longitude: 77.680,
    description: "Bellandur Outer Ring Road near EcoSpace completely waterlogged. Water is 3 feet deep. Traffic stalled.",
    aiLabel: "FLOODED_ROAD",
    aiConfidence: 0.96,
    severity: "CRITICAL",
    status: "DISPATCHED",
    assignedTo: "BBMP Stormwater Dept"
  },
  // Chennai
  {
    cityName: "Chennai",
    wardName: "Chennai - Velachery (Lake Basin)",
    reporterName: "Sundar Rajan",
    reporterPhone: "+919444012345",
    latitude: 12.978,
    longitude: 80.225,
    description: "Velachery main road underpass completely flooded due to heavy downpour. Water height 4 feet. Cars turning back.",
    aiLabel: "FLOODED_ROAD",
    aiConfidence: 0.98,
    severity: "CRITICAL",
    status: "REPORTED",
    assignedTo: null
  },
  {
    cityName: "Chennai",
    wardName: "Chennai - T-Nagar (Commercial)",
    reporterName: "Meena Krishnan",
    reporterPhone: "+919444111222",
    latitude: 13.039,
    longitude: 80.231,
    description: "Usman Road T-Nagar. Silt block in storm drains causing water pooling on street shops frontage.",
    aiLabel: "BLOCKED_DRAIN",
    aiConfidence: 0.91,
    severity: "MEDIUM",
    status: "INVESTIGATING",
    assignedTo: "GCC Engineering Squad B"
  },
  // Hyderabad
  {
    cityName: "Hyderabad",
    wardName: "Hyderabad - Begumpet (Low-Lying Area)",
    reporterName: "Kiran Reddy",
    reporterPhone: "+919900887766",
    latitude: 17.442,
    longitude: 78.472,
    description: "Begumpet main road waterlogged near metro station. Heavy block in the stormwater channel causes backflow onto roads.",
    aiLabel: "FLOODED_ROAD",
    aiConfidence: 0.94,
    severity: "HIGH",
    status: "REPORTED",
    assignedTo: null
  },
  // Guwahati
  {
    cityName: "Guwahati",
    wardName: "Guwahati - Zoo Road (Commercial)",
    reporterName: "Jiten Boro",
    reporterPhone: "+919855443322",
    latitude: 26.160,
    longitude: 91.778,
    description: "RG Baruah Road (Zoo Road) under waist-deep water. Landslide mud has blocked the local drains, overflow is severe.",
    aiLabel: "BLOCKED_DRAIN",
    aiConfidence: 0.98,
    severity: "CRITICAL",
    status: "DISPATCHED",
    assignedTo: "Guwahati Municipal Corp Response Team"
  }
];

const mockAlerts = [
  {
    cityName: "Mumbai",
    title: "High Tide Overflow Alert",
    message: "Crawford Market (Ward B) low-lying corridors experiencing overflow hazard due to heavy rainfall overlapping with High Tide.",
    severity: "DANGER"
  },
  {
    cityName: "Bengaluru",
    title: "ORR Rajakaluve Warning",
    message: "Mahadevapura IT Corridor channel overflow warning near EcoSpace Bellandur service lanes.",
    severity: "WARNING"
  },
  {
    cityName: "Chennai",
    title: "Velachery Inundation Warning",
    message: "Velachery main road subway closed. Residents advised to avoid waterlogged underpasses.",
    severity: "DANGER"
  },
  {
    cityName: "Hyderabad",
    title: "Begumpet Stormwater Inundation Warning",
    message: "Begumpet drainage channel overflows. Commuters are advised to avoid Rasoolpura and Begumpet routes.",
    severity: "WARNING"
  },
  {
    cityName: "Guwahati",
    title: "Zoo Road Flash Flood Alert",
    message: "Heavy monsoonal precipitation causing flash floods on RG Baruah road. Avoid low-lying sectors near Anil Nagar.",
    severity: "DANGER"
  }
];

async function main() {
  console.log("Cleaning database...");
  await prisma.copilotConversation.deleteMany();
  await prisma.copilotInsight.deleteMany();
  await prisma.satelliteImage.deleteMany();
  await prisma.digitalTwinScenario.deleteMany();
  await prisma.floodPrediction.deleteMany();
  await prisma.emergencyAlert.deleteMany();
  await prisma.incidentReport.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.city.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding Cities...");
  const cities: any = {};
  for (const cityData of mockCities) {
    const c = await prisma.city.create({ data: cityData });
    cities[c.name] = c;
  }

  console.log("Seeding Wards...");
  const wards: any = {};
  for (const wardData of mockWards) {
    const { cityName, ...rest } = wardData;
    const w = await prisma.ward.create({
      data: {
        ...rest,
        cityId: cities[cityName].id
      }
    });
    wards[w.name] = w;
  }

  console.log("Seeding Users...");
  await prisma.user.create({
    data: {
      email: "citizen@floodpulse.ai",
      name: "National Citizen",
      role: "CITIZEN"
    }
  });
  await prisma.user.create({
    data: {
      email: "official@floodpulse.ai",
      name: "Smart City Director",
      role: "MUNICIPAL_OFFICIAL"
    }
  });

  console.log("Seeding Incidents...");
  for (const incidentData of mockIncidents) {
    const { cityName, wardName, ...rest } = incidentData;
    if (wardName && !wards[wardName]) {
      console.error(`Ward not found: "${wardName}". Available wards:`, Object.keys(wards));
    }
    await prisma.incidentReport.create({
      data: {
        ...rest,
        cityId: cities[cityName].id,
        wardId: wardName ? wards[wardName].id : null,
        imageUrl: "/demo-flood.jpg"
      }
    });
  }

  console.log("Seeding Alerts...");
  for (const alertData of mockAlerts) {
    const { cityName, ...rest } = alertData;
    await prisma.emergencyAlert.create({
      data: {
        ...rest,
        cityId: cities[cityName].id,
        isActive: true
      }
    });
  }

  console.log("Seeding Predictions via Engine...");
  for (const cityName of Object.keys(cities)) {
    const city = cities[cityName];
    await generateForecastsForCity(city.id);
  }

  console.log("Seeding Digital Twin Scenarios & Polygons...");
  for (const cityName of Object.keys(cities)) {
    const city = cities[cityName];
    // Pre-seed 3h, 6h, 12h, 24h simulations
    const windows = [3, 6, 12, 24];
    for (const hours of windows) {
      await runDigitalTwinSimulation(city.id, 35, hours);
    }
  }

  console.log("Seeding Satellite imagery & detected flood zones...");
  for (const cityName of Object.keys(cities)) {
    const city = cities[cityName];
    await runSatelliteFloodAnalysis(city.id, "Sentinel-1 SAR");
    await runSatelliteFloodAnalysis(city.id, "Sentinel-2 NDWI");
  }

  console.log("Seeding Copilot conversations & insights...");
  for (const cityName of Object.keys(cities)) {
    const city = cities[cityName];
    
    // Seed initial greeting/sample conversation
    await prisma.copilotConversation.create({
      data: {
        cityId: city.id,
        userQuery: "Summarize city flood status.",
        aiResponse: JSON.stringify({
          summary: `### Operations Summary for ${city.name}\nWeather systems report stable conditions. Risk indexes in central wards remain below critical levels. Drainage lines are functioning normally.`,
          evidence: ["Active reports size: 0.", "Average city ward readiness: 85%."],
          confidence: 95,
          recommendedActions: ["Execute standard hourly predictive updates.", "Monitor local drainage inlets."]
        }),
        evidence: JSON.stringify(["Active reports size: 0.", "Average city ward readiness: 85%."]),
        confidence: 95,
        actions: JSON.stringify(["Execute standard hourly predictive updates.", "Monitor local drainage inlets."])
      }
    });

    // Seed initial insight
    await prisma.copilotInsight.create({
      data: {
        cityId: city.id,
        summary: `Command Center summary compiled for ${city.name}. Sensor networks show low risk levels. Wards risk levels remain stable under current precipitation loads.`,
        recommendations: JSON.stringify(["Verify standby crew locations.", "Perform standard gauge checks."]),
        alerts: JSON.stringify(["No warnings in effect."]),
        wardRankings: JSON.stringify([])
      }
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
