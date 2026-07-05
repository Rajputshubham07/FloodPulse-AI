import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";
import { updateWardRiskScore } from "../../../services/wardHelper";
import { calculateRiskScore } from "../../../services/riskEngine";

// Helper to extract static attributes based on ward name
function getWardPhysicalAttributes(name: string) {
  if (name.includes("Mahadevapura")) {
    return { elevation: 870, proximityToWater: 150, historicalFrequency: 18 };
  } else if (name.includes("Bommanahalli")) {
    return { elevation: 882, proximityToWater: 300, historicalFrequency: 12 };
  } else if (name.includes("Indiranagar")) {
    return { elevation: 910, proximityToWater: 800, historicalFrequency: 4 };
  } else {
    return { elevation: 920, proximityToWater: 1200, historicalFrequency: 2 };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rainfallParam = searchParams.get("rainfall");
    const currentRainfall = rainfallParam ? parseFloat(rainfallParam) : 25;

    let wards = await prisma.ward.findMany({
      include: {
        reports: {
          where: {
            status: { not: "RESOLVED" }
          }
        }
      }
    });

    // If rainfall parameter is passed, update scores in database first
    if (rainfallParam !== null && !isNaN(currentRainfall)) {
      for (const ward of wards) {
        await updateWardRiskScore(ward.id, currentRainfall);
      }
      // Re-fetch updated records
      wards = await prisma.ward.findMany({
        include: {
          reports: {
            where: {
              status: { not: "RESOLVED" }
            }
          }
        }
      });
    }

    // Enrich wards with explainable breakdown and readiness scores on-the-fly
    const enrichedWards = wards.map(ward => {
      const physical = getWardPhysicalAttributes(ward.name);
      const activeReportCount = ward.reports.length;

      // Calculate response delay hours if reports are pending
      let responseDelayHours = 0;
      if (ward.reports.length > 0) {
        const oldestReport = ward.reports.reduce((oldest, current) => {
          return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
        });
        const msDiff = new Date().getTime() - new Date(oldestReport.createdAt).getTime();
        responseDelayHours = Math.max(0, msDiff / (1000 * 60 * 60));
      }

      const analysis = calculateRiskScore({
        rainfall: currentRainfall,
        elevation: physical.elevation,
        proximityToWater: physical.proximityToWater,
        reportCount: activeReportCount,
        historicalFrequency: physical.historicalFrequency,
        responseDelayHours
      });

      return {
        ...ward,
        riskScore: analysis.score,
        riskLevel: analysis.level,
        readinessScore: analysis.readinessScore,
        breakdown: analysis.breakdown
      };
    });

    return NextResponse.json(enrichedWards);
  } catch (error: any) {
    console.error("GET wards error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch wards" }, { status: 500 });
  }
}
