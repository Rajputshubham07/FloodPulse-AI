import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");
    const window = searchParams.get("window"); // "3h", "6h", "12h", "24h"

    const where: any = {};
    if (window) {
      where.predictionWindow = window;
    }
    if (cityId) {
      where.ward = { cityId };
    }

    const predictions = await prisma.floodPrediction.findMany({
      where,
      include: {
        ward: {
          select: {
            name: true,
            cityId: true
          }
        }
      },
      orderBy: [
        { probability: "desc" },
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json(predictions);
  } catch (error: any) {
    console.error("GET /api/predictions error:", error);
    return NextResponse.json({ error: error.message || "Failed to load predictions" }, { status: 500 });
  }
}
