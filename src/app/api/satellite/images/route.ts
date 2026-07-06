import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");

    const where: any = {};
    if (cityId) {
      where.cityId = cityId;
    }

    const images = await prisma.satelliteImage.findMany({
      where,
      orderBy: { acquisitionDate: "desc" }
    });

    const parsedImages = images.map(img => ({
      ...img,
      metadata: JSON.parse(img.metadata)
    }));

    return NextResponse.json(parsedImages);
  } catch (error: any) {
    console.error("GET satellite images error:", error);
    return NextResponse.json({ error: error.message || "Failed to load satellite images" }, { status: 500 });
  }
}
