import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("scenarioId");

    if (!scenarioId) {
      return NextResponse.json({ error: "Missing scenarioId parameter" }, { status: 400 });
    }

    const polygons = await prisma.floodPolygon.findMany({
      where: { scenarioId },
      orderBy: { waterDepth: "desc" }
    });

    // Parse the GeoJSON strings to actual JSON objects before returning
    const parsedPolygons = polygons.map((p) => ({
      ...p,
      geometry: JSON.parse(p.geometry)
    }));

    return NextResponse.json(parsedPolygons);
  } catch (error: any) {
    console.error("GET polygons error:", error);
    return NextResponse.json({ error: error.message || "Failed to load polygons" }, { status: 500 });
  }
}
