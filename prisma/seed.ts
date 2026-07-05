import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const mockWards = [
  {
    name: "Ward A: Downtown Core",
    riskScore: 42.5,
    riskLevel: "MEDIUM",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-71.065, 42.355],
          [-71.050, 42.355],
          [-71.050, 42.365],
          [-71.065, 42.365],
          [-71.065, 42.355]
        ]]
      }
    })
  },
  {
    name: "Ward B: Riverfront East",
    riskScore: 82.0,
    riskLevel: "CRITICAL",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-71.050, 42.350],
          [-71.035, 42.350],
          [-71.035, 42.360],
          [-71.050, 42.360],
          [-71.050, 42.350]
        ]]
      }
    })
  },
  {
    name: "Ward C: Industrial Basin",
    riskScore: 68.4,
    riskLevel: "HIGH",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-71.060, 42.340],
          [-71.045, 42.340],
          [-71.045, 42.350],
          [-71.060, 42.350],
          [-71.060, 42.340]
        ]]
      }
    })
  },
  {
    name: "Ward D: West Heights",
    riskScore: 12.8,
    riskLevel: "LOW",
    boundaryJson: JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-71.080, 42.350],
          [-71.065, 42.350],
          [-71.065, 42.365],
          [-71.080, 42.365],
          [-71.080, 42.350]
        ]]
      }
    })
  }
];

const mockIncidents = [
  {
    reporterName: "Alice Miller",
    reporterPhone: "+15550192",
    latitude: 42.358,
    longitude: -71.061,
    description: "Water accumulating rapidly near the subway entrance. Grates seem blocked by leaves.",
    aiLabel: "BLOCKED_DRAIN",
    aiConfidence: 0.94,
    severity: "MEDIUM",
    status: "INVESTIGATING",
    assignedTo: "City Drainage Dept"
  },
  {
    reporterName: "Marcus Vance",
    reporterPhone: "+15550239",
    latitude: 42.353,
    longitude: -71.042,
    description: "Flooding on Main St. Water level is above the sidewalk. Cars are turning back.",
    aiLabel: "FLOODED_ROAD",
    aiConfidence: 0.98,
    severity: "CRITICAL",
    status: "DISPATCHED",
    assignedTo: "Emergency Response Squad B"
  },
  {
    reporterName: "Sarah Connor",
    reporterPhone: "+15550111",
    latitude: 42.345,
    longitude: -71.052,
    description: "Minor water pooling at the edge of the street, but draining slowly.",
    aiLabel: "MINOR_WATERLOGGING",
    aiConfidence: 0.88,
    severity: "LOW",
    status: "REPORTED",
    assignedTo: null
  },
  {
    reporterName: "System Sensor A4",
    reporterPhone: "Automated Sensor",
    latitude: 42.356,
    longitude: -71.048,
    description: "Critical water level reached in Storm Drain #412.",
    aiLabel: "MAJOR_WATERLOGGING",
    aiConfidence: 1.00,
    severity: "HIGH",
    status: "REPORTED",
    assignedTo: "Muni Engineering"
  }
];

const mockAlerts = [
  {
    title: "River Overflow Warning",
    message: "Riverfront East (Ward B) is experiencing high overflow risk due to heavy rains upstream. Avoid lower harbor roads.",
    severity: "DANGER",
    isActive: true
  },
  {
    title: "Flash Flood Watch",
    message: "High rainfall expected over Downtown Core (Ward A) and Industrial Basin (Ward C). Drainage capacity is running at 90%.",
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

  console.log("Seeding Wards...");
  const wards = [];
  for (const wardData of mockWards) {
    const w = await prisma.ward.create({ data: wardData });
    wards.push(w);
  }

  console.log("Seeding Users...");
  await prisma.user.create({
    data: {
      email: "citizen@floodpulse.ai",
      name: "John Citizen",
      role: "CITIZEN"
    }
  });
  await prisma.user.create({
    data: {
      email: "official@floodpulse.ai",
      name: "Elena Rostova",
      role: "MUNICIPAL_OFFICIAL"
    }
  });
  await prisma.user.create({
    data: {
      email: "commander@floodpulse.ai",
      name: "Chief Henderson",
      role: "DISASTER_TEAM"
    }
  });

  console.log("Seeding Incidents...");
  // Link incidents to wards based on simple coordinate boundaries or matching name
  for (const incidentData of mockIncidents) {
    // Basic assignment based on latitude/longitude
    let assignedWardId: string | null = null;
    if (incidentData.latitude > 42.354 && incidentData.longitude < -71.050) {
      assignedWardId = wards.find(w => w.name.includes("Downtown"))?.id || null;
    } else if (incidentData.longitude >= -71.050 && incidentData.latitude > 42.350) {
      assignedWardId = wards.find(w => w.name.includes("Riverfront"))?.id || null;
    } else if (incidentData.latitude <= 42.350) {
      assignedWardId = wards.find(w => w.name.includes("Industrial"))?.id || null;
    }

    await prisma.incidentReport.create({
      data: {
        ...incidentData,
        wardId: assignedWardId,
        imageUrl: "/demo-flood.jpg" // placeholder image in public uploads
      }
    });
  }

  console.log("Seeding Alerts...");
  for (const alertData of mockAlerts) {
    let assignedWardId: string | null = null;
    if (alertData.title.includes("River")) {
      assignedWardId = wards.find(w => w.name.includes("Riverfront"))?.id || null;
    } else if (alertData.title.includes("Flash")) {
      assignedWardId = wards.find(w => w.name.includes("Downtown"))?.id || null;
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
