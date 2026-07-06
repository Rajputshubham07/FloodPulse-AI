import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wardId: string }> }
) {
  try {
    const { wardId } = await params;
    const predictions = await prisma.floodPrediction.findMany({
      where: { wardId },
      orderBy: { predictionWindow: "asc" }
    });

    return NextResponse.json(predictions);
  } catch (error: any) {
    console.error("GET /api/predictions/[wardId] error:", error);
    return NextResponse.json({ error: error.message || "Failed to load predictions" }, { status: 500 });
  }
}
