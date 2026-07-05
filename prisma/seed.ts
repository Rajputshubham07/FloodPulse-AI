import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const mockWards = [
  {
    name: "Zone: Mahadevapura (IT Corridor)",
    riskScore: 84.5,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
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
    name: "Zone: Bommanahalli (South-East)",
    riskScore: 72.0,
    riskLevel: "HIGH",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
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
  {
    name: "Zone: Indiranagar (East Zone)",
    riskScore: 32.4,
    riskLevel: "MEDIUM",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.610, 12.945],
          [77.650, 12.945],
          [77.650, 12.985],
          [77.610, 12.985],
          [77.610, 12.945]
        ]]
      }
    })
  },
  {
    name: "Zone: Jayanagar (South Zone)",
    riskScore: 12.8,
    riskLevel: "LOW",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.560, 12.910],
          [77.605, 12.910],
          [77.605, 12.955],
          [77.560, 12.955],
          [77.560, 12.910]
        ]]
      }
    })
  }
];

const mockIncidents = [
  {
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
  {
    reporterName: "Anita Sen",
    reporterPhone: "+919900112233",
    latitude: 12.917,
    longitude: 77.623,
    description: "Silk Board junction underpass flooded. Multiple cars stranded. Local drainage choked.",
    aiLabel: "BLOCKED_DRAIN",
    aiConfidence: 0.94,
    severity: "HIGH",
    status: "INVESTIGATING",
    assignedTo: "Muni Drainage Division B"
  },
  {
    reporterName: "Vikram Malhotra",
    reporterPhone: "+919555667788",
    latitude: 12.968,
    longitude: 77.642,
    description: "Indiranagar 100 Feet Road. Minor water accumulation on side walk. Traffic moving slowly.",
    aiLabel: "MINOR_WATERLOGGING",
    aiConfidence: 0.88,
    severity: "LOW",
    status: "REPORTED",
    assignedTo: null
  },
  {
    reporterName: "Sensor ORR-12",
    reporterPhone: "Automated Telemetry",
    latitude: 12.998,
    longitude: 77.695,
    description: "Karthik Nagar Rajakaluve channel overflowing. Severe spillover onto service lane.",
    aiLabel: "MAJOR_WATERLOGGING",
    aiConfidence: 0.99,
    severity: "CRITICAL",
    status: "REPORTED",
    assignedTo: "BBMP Disaster Ops"
  }
];

const mockAlerts = [
  {
    title: "Rajakaluve Overflow Alert",
    message: "Mahadevapura IT Corridor experiencing heavy channel overflows near Bellandur lake basin. Avoid low service roads.",
    severity: "DANGER",
    isActive: true
  },
  {
    title: "Waterlogging Advisory",
    message: "Heavy waterlogging reported near Silk Board (Bommanahalli Zone) and surrounding service roads.",
    severity: "WARNING",
    isActive: true
  }
];

async function main() {
  console.log("Cleaning database...");
  await prisma.emergencyAlert.deleteMany();
  await prisma.incidentReport.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding Wards (Bengaluru Zones)...");
  const wards = [];
  for (const wardData of mockWards) {
    const w = await prisma.ward.create({ data: wardData });
    wards.push(w);
  }

  console.log("Seeding Users...");
  await prisma.user.create({
    data: {
      email: "citizen@floodpulse.ai",
      name: "Bengaluru Citizen",
      role: "CITIZEN"
    }
  });
  await prisma.user.create({
    data: {
      email: "official@floodpulse.ai",
      name: "BBMP Commissioner",
      role: "MUNICIPAL_OFFICIAL"
    }
  });
  await prisma.user.create({
    data: {
      email: "commander@floodpulse.ai",
      name: "NDRF Commander Karnataka",
      role: "DISASTER_TEAM"
    }
  });

  console.log("Seeding Incidents...");
  for (const incidentData of mockIncidents) {
    // Map coordinate to appropriate zone
    let assignedWardId: string | null = null;
    if (incidentData.latitude > 12.95 && incidentData.longitude > 77.65) {
      assignedWardId = wards.find(w => w.name.includes("Mahadevapura"))?.id || null;
    } else if (incidentData.latitude <= 12.94 && incidentData.longitude > 77.60) {
      assignedWardId = wards.find(w => w.name.includes("Bommanahalli"))?.id || null;
    } else if (incidentData.latitude > 12.94 && incidentData.longitude <= 77.65) {
      assignedWardId = wards.find(w => w.name.includes("Indiranagar"))?.id || null;
    }

    await prisma.incidentReport.create({
      data: {
        ...incidentData,
        wardId: assignedWardId,
        imageUrl: "/demo-flood.jpg"
      }
    });
  }

  console.log("Seeding Alerts...");
  for (const alertData of mockAlerts) {
    let assignedWardId: string | null = null;
    if (alertData.title.includes("Rajakaluve")) {
      assignedWardId = wards.find(w => w.name.includes("Mahadevapura"))?.id || null;
    } else if (alertData.title.includes("Waterlogging")) {
      assignedWardId = wards.find(w => w.name.includes("Bommanahalli"))?.id || null;
    }
    await prisma.emergencyAlert.create({
      data: {
        ...alertData,
        wardId: assignedWardId
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
