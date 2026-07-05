import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";
import { updateWardRiskScore } from "../../../services/wardHelper";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rainfallParam = searchParams.get("rainfall");

    const wards = await prisma.ward.findMany({
      include: {
        reports: {
          where: {
            status: { not: "RESOLVED" }
          }
        }
      }
    });

    // If rainfall parameter is passed, dynamically update ward risk scores
    if (rainfallParam !== null) {
      const rainfall = parseFloat(rainfallParam);
      if (!isNaN(rainfall)) {
        for (const ward of wards) {
          await updateWardRiskScore(ward.id, rainfall);
        }
        // Fetch updated wards
        const updatedWards = await prisma.ward.findMany({
          include: {
            reports: {
              where: {
                status: { not: "RESOLVED" }
              }
            }
          }
        });
        return NextResponse.json(updatedWards);
      }
    }

    return NextResponse.json(wards);
  } catch (error: any) {
    console.error("GET wards error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch wards" }, { status: 500 });
  }
}
