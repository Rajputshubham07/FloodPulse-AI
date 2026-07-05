import { NextResponse } from "next/server";
import { prisma } from "../../../../services/db";
import { updateWardRiskScore } from "../../../../services/wardHelper";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const incident = await prisma.incidentReport.findUnique({
      where: { id },
      include: { ward: true }
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json(incident);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch incident" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { severity, status, assignedTo } = body;

    const incident = await prisma.incidentReport.findUnique({
      where: { id }
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Update fields
    const updatedIncident = await prisma.incidentReport.update({
      where: { id },
      data: {
        ...(severity && { severity }),
        ...(status && { status }),
        ...(assignedTo !== undefined && { assignedTo })
      },
      include: { ward: true }
    });

    // Recalculate ward risk score if status changed or wardId exists
    if (updatedIncident.wardId) {
      await updateWardRiskScore(updatedIncident.wardId);
    }

    return NextResponse.json(updatedIncident);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update incident" }, { status: 500 });
  }
}
