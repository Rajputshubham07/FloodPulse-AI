import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");

    if (!cityId) {
      return NextResponse.json({ error: "Missing cityId" }, { status: 400 });
    }

    // Check if there is an insight generated in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let insight = await prisma.copilotInsight.findFirst({
      where: {
        cityId,
        createdAt: { gte: oneHourAgo }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!insight) {
      // Compile new insight on the fly
      const city = await prisma.city.findUnique({
        where: { id: cityId },
        include: {
          wards: {
            include: {
              predictions: {
                where: { predictionWindow: "6h" }
              }
            }
          },
          incidents: {
            where: { status: { not: "RESOLVED" } }
          }
        }
      });

      if (!city) {
        return NextResponse.json({ error: "City not found" }, { status: 404 });
      }

      // Compile metrics
      const criticalWardsCount = city.wards.filter(w => w.riskLevel === "CRITICAL").length;
      const totalIncidents = city.incidents.length;

      const rankings = city.wards
        .map(w => ({
          name: w.name.split(":")[0],
          score: w.riskScore,
          level: w.riskLevel
        }))
        .sort((a, b) => b.score - a.score);

      const summary = `Smart City Operations Center summary compiled. Currently, ${criticalWardsCount} wards are at CRITICAL risk status, with ${totalIncidents} active drainage blockages. Predicted weather patterns require immediate staging of pumps in low-lying intersections.`;

      const recommendations = [
        "Deploy high-volume drainage pumps to Crawford Market.",
        "Check standby power generator fuel levels at Begumpet Station.",
        "Pre-stage evacuation vehicles near low-elevation channels."
      ];

      const alerts = [
        "Monsoon drainage alert: Ward B risk index is 88%.",
        "Sentinel SAR reports high radar backscatter anomalies."
      ];

      insight = await prisma.copilotInsight.create({
        data: {
          cityId,
          summary,
          recommendations: JSON.stringify(recommendations),
          alerts: JSON.stringify(alerts),
          wardRankings: JSON.stringify(rankings)
        }
      });
    }

    return NextResponse.json({
      id: insight.id,
      cityId: insight.cityId,
      summary: insight.summary,
      recommendations: JSON.parse(insight.recommendations),
      alerts: JSON.parse(insight.alerts),
      wardRankings: JSON.parse(insight.wardRankings),
      createdAt: insight.createdAt
    });
  } catch (error: any) {
    console.error("GET copilot insights error:", error);
    return NextResponse.json({ error: error.message || "Failed to load copilot insights" }, { status: 500 });
  }
}
