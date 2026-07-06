import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");

    if (!cityId) {
      return NextResponse.json({ error: "Missing cityId parameter" }, { status: 400 });
    }

    const detections = await prisma.floodDetection.findMany({
      where: {
        image: { cityId }
      },
      include: {
        image: true
      }
    });

    const parsedDetections = detections.map(d => ({
      ...d,
      geometry: JSON.parse(d.geometry)
    }));

    return NextResponse.json(parsedDetections);
  } catch (error: any) {
    console.error("GET satellite heatmap error:", error);
    return NextResponse.json({ error: error.message || "Failed to load satellite heatmap" }, { status: 500 });
  }
}
