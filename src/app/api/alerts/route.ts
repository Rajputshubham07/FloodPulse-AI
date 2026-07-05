import { NextResponse } from "next/server";
import { prisma } from "../../../services/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";

    const alerts = await prisma.emergencyAlert.findMany({
      where: activeOnly ? { isActive: true } : {},
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
    const { title, message, severity, wardId } = body;

    if (!title || !message || !severity) {
      return NextResponse.json({ error: "Title, message, and severity are required" }, { status: 400 });
    }

    const newAlert = await prisma.emergencyAlert.create({
      data: {
        title,
        message,
        severity, // INFO, WARNING, DANGER
        wardId: wardId || null,
        isActive: true
      }
    });

    return NextResponse.json(newAlert, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create emergency alert" }, { status: 500 });
  }
}
