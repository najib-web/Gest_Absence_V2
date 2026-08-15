import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const session = await db.session.findUnique({
    where: { id },
    include: {
      teacher: true,
      classe: { include: { niveau: true, groups: true } },
      service: true,
      absences: { include: { student: true } },
    },
  });

  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  // Get all students of the class for attendance marking
  const students = await db.student.findMany({
    where: { classeId: session.classeId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Map absences
  const absenceMap = new Map(session.absences.map((a) => [a.studentId, a]));

  const studentsWithStatus = students.map((s) => ({
    ...s,
    absence: absenceMap.get(s.id) || null,
  }));

  return NextResponse.json({
    session: {
      ...session,
      students: studentsWithStatus,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== "SURVEILLANT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await db.session.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
