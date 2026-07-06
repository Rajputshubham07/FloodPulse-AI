import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");

    if (!cityId) {
      return NextResponse.json({ error: "Missing cityId" }, { status: 400 });
    }

    // Get the latest scenarios for 3h, 6h, 12h, 24h
    const scenarios = await prisma.digitalTwinScenario.findMany({
      where: { cityId },
      orderBy: { generatedAt: "desc" },
      take: 20
    });

    // Group the latest scenarios by simulation hours to form a clean trend timeline
    const timelineHours = [3, 6, 12, 24];
    const trendData = timelineHours.map((h) => {
      const match = scenarios.find((s) => s.simulationHours === h);
      return {
        hours: `${h}h`,
        population: match ? match.affectedPopulation : 0,
        roads: match ? match.affectedRoadLength : 0,
        area: match ? match.floodAreaKm2 : 0,
        rainfall: match ? match.rainfallAmount : 0
      };
    });

    return NextResponse.json({
      cityId,
      trendData
    });
  } catch (error: any) {
    console.error("GET impact stats error:", error);
    return NextResponse.json({ error: error.message || "Failed to compile impact trends" }, { status: 500 });
  }
}
