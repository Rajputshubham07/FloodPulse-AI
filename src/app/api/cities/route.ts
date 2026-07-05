import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      include: {
        _count: {
          select: {
            incidents: {
              where: { status: { not: "RESOLVED" } }
            },
            alerts: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: {
        riskScore: "desc"
      }
    });

    // Map counts to friendly formats
    const response = cities.map(city => ({
      id: city.id,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      zoomLevel: city.zoomLevel,
      readinessScore: city.readinessScore,
      riskScore: city.riskScore,
      riskLevel: city.riskLevel,
      description: city.description,
      activeIncidentsCount: city._count.incidents,
      activeAlertsCount: city._count.alerts
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch cities:", error);
    return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 });
  }
}
