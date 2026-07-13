import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pickRandomCase } from "@/lib/cases";

const RESUME_WINDOW_DAYS = 3;

export async function POST(req: NextRequest) {
  const { name, email, forceNew } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  const normalizedEmail = email.trim().toLowerCase();

  if (!forceNew) {
    const since = new Date(Date.now() - RESUME_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    // Sessão sem nenhuma troca não vale retomada — recomeçar é idêntico.
    const resumable = await prisma.session.findFirst({
      where: { candidateEmail: normalizedEmail, completedAt: null, startedAt: { gte: since }, logs: { some: {} } },
      orderBy: { startedAt: "desc" },
      include: { logs: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
    });
    if (resumable) {
      // Quem já concluiu um teste depois dessa tentativa não deve voltar a ela.
      const completedAfter = await prisma.session.findFirst({
        where: { candidateEmail: normalizedEmail, completedAt: { gte: resumable.startedAt } },
      });
      if (!completedAfter) {
        return NextResponse.json({ resumable: { sessionId: resumable.id, caseTitle: resumable.caseTitle, startedAt: resumable.startedAt, lastSavedAt: resumable.logs[0]?.createdAt ?? resumable.startedAt } });
      }
    }
  }

  const c = pickRandomCase();
  const session = await prisma.session.create({
    data: { candidateName: name.trim(), candidateEmail: normalizedEmail, caseId: c.id, caseTitle: c.title, caseDomain: c.domain },
  });
  return NextResponse.json({ sessionId: session.id, caseId: c.id });
}
