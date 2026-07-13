import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: { evaluation: true, logs: { orderBy: { sequenceNumber: "asc" } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session: { id: session.id, candidateName: session.candidateName, caseId: session.caseId, startedAt: session.startedAt, completedAt: session.completedAt }, evaluation: session.evaluation, logCount: session.logs.length, logs: session.logs.map(l => ({ role: l.role, content: l.content })) });
}
