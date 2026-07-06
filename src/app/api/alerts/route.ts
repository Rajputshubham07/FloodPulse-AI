import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";
    const cityId = searchParams.get("cityId");

    const where: any = {};
    if (activeOnly) where.isActive = true;
    if (cityId) where.cityId = cityId;

    const alerts = await prisma.emergencyAlert.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(alerts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, severity, wardId, cityId } = body;

    if (!title || !message || !severity) {
      return NextResponse.json({ error: "Title, message, and severity are required" }, { status: 400 });
    }

    let finalCityId = cityId;
    if (finalCityId) {
      const cityExists = await prisma.city.findUnique({ where: { id: finalCityId } });
      if (!cityExists) {
        finalCityId = null;
      }
    }
    if (!finalCityId && wardId) {
      const ward = await prisma.ward.findUnique({
        where: { id: wardId },
        select: { cityId: true }
      });
      if (ward) finalCityId = ward.cityId;
    }

    if (!finalCityId) {
      const firstCity = await prisma.city.findFirst();
      if (!firstCity) {
        return NextResponse.json({ error: "No cities configured in database" }, { status: 500 });
      }
      finalCityId = firstCity.id;
    }

    const newAlert = await prisma.emergencyAlert.create({
      data: {
        title,
        message,
        severity, // INFO, WARNING, DANGER
        cityId: finalCityId,
        wardId: wardId || null,
        isActive: true
      }
    });

    return NextResponse.json(newAlert, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create emergency alert" }, { status: 500 });
  }
}
