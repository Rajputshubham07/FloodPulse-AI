import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId parameter" }, { status: 400 });
    }

    const detections = await prisma.floodDetection.findMany({
      where: { imageId }
    });

    const parsedDetections = detections.map(det => ({
      ...det,
      geometry: JSON.parse(det.geometry)
    }));

    return NextResponse.json(parsedDetections);
  } catch (error: any) {
    console.error("GET satellite detections error:", error);
    return NextResponse.json({ error: error.message || "Failed to load satellite detections" }, { status: 500 });
  }
}
