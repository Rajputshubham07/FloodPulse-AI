import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// Mumbai Coordinates: Lat ~18.93, Lng ~72.83 (South Mumbai - Ward A, B, C limits)
const mockWards = [
  {
    name: "Ward A: Colaba / Fort / Churchgate",
    riskScore: 68.5,
    riskLevel: "HIGH",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
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
    name: "Ward B: Sandhurst Road / Crawford Market",
    riskScore: 84.0,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
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
  {
    name: "Ward C: Marine Lines / Metro Cinema",
    riskScore: 35.4,
    riskLevel: "MEDIUM",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [72.810, 18.940],
          [72.830, 18.940],
          [72.830, 18.958],
          [72.810, 18.958],
          [72.810, 18.940]
        ]]
      }
    })
  }
];

const mockIncidents = [
  {
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
  {
    reporterName: "Karan Johar",
    reporterPhone: "+919833445566",
    latitude: 18.937,
    longitude: 72.838,
    description: "Ballard Estate business district. Water logging on service roads up to vehicle tyres level.",
    aiLabel: "MINOR_WATERLOGGING",
    aiConfidence: 0.86,
    severity: "LOW",
    status: "REPORTED",
    assignedTo: null
  },
  {
    reporterName: "Telemetry Node D2",
    reporterPhone: "Automated Sensor",
    latitude: 18.943,
    longitude: 72.825,
    description: "Metro Cinema junction flooded. High water level on road stalls traffic.",
    aiLabel: "MAJOR_WATERLOGGING",
    aiConfidence: 0.99,
    severity: "CRITICAL",
    status: "REPORTED",
    assignedTo: "MCGM Emergency Operations"
  },
  {
    reporterName: "Rohit Patil",
    reporterPhone: "+919844556677",
    latitude: 18.928,
    longitude: 72.824,
    description: "Mantralaya main lane road waterlogged. Storm drainage capacity full.",
    aiLabel: "MAJOR_WATERLOGGING",
    aiConfidence: 0.91,
    severity: "HIGH",
    status: "REPORTED",
    assignedTo: "South Mumbai Engineering"
  }
];

const mockAlerts = [
  {
    title: "High Tide Overflow Alert",
    message: "Crawford Market (Ward B) and Marine Lines (Ward C) low-lying corridors experiencing overflow hazard due to heavy rainfall overlapping with High Tide.",
    severity: "DANGER",
    isActive: true
  },
  {
    title: "Churchgate Subway Warning",
    message: "Avoid subway walks near Churchgate Station due to active flooding.",
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

  console.log("Seeding Wards (South Mumbai Zones)...");
  const wards = [];
  for (const wardData of mockWards) {
    const w = await prisma.ward.create({ data: wardData });
    wards.push(w);
  }

  console.log("Seeding Users...");
  await prisma.user.create({
    data: {
      email: "citizen@floodpulse.ai",
      name: "Mumbai Citizen",
      role: "CITIZEN"
    }
  });
  await prisma.user.create({
    data: {
      email: "official@floodpulse.ai",
      name: "MCGM Commissioner",
      role: "MUNICIPAL_OFFICIAL"
    }
  });
  await prisma.user.create({
    data: {
      email: "commander@floodpulse.ai",
      name: "NDRF Commander Mumbai",
      role: "DISASTER_TEAM"
    }
  });

  console.log("Seeding Incidents...");
  for (const incidentData of mockIncidents) {
    let assignedWardId: string | null = null;
    if (incidentData.latitude < 18.940) {
      assignedWardId = wards.find(w => w.name.includes("Ward A"))?.id || null;
    } else if (incidentData.longitude > 72.830) {
      assignedWardId = wards.find(w => w.name.includes("Ward B"))?.id || null;
    } else {
      assignedWardId = wards.find(w => w.name.includes("Ward C"))?.id || null;
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
    if (alertData.title.includes("High Tide")) {
      assignedWardId = wards.find(w => w.name.includes("Ward B"))?.id || null;
    } else if (alertData.title.includes("Subway")) {
      assignedWardId = wards.find(w => w.name.includes("Ward A"))?.id || null;
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
