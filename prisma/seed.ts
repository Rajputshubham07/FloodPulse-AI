import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

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
  }
];

async function main() {
  console.log("Cleaning database...");
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
