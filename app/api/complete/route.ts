import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runEvaluation } from "@/lib/evaluator";

export async function POST(req: NextRequest) {
  const { sessionId, postTestData, finalOutput } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { logs: { orderBy: { sequenceNumber: "asc" } } } });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const durationSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
  const avg = (b: Record<string, number>) => { const v = Object.values(b || {}); return v.length ? v.reduce((a,x)=>a+x,0)/v.length : null; };

  await prisma.session.update({ where: { id: sessionId }, data: {
    completedAt: new Date(), durationSeconds, finalOutput: finalOutput || null,
    postTestBlockA: postTestData?.blockA || {}, postTestBlockB: postTestData?.blockB || {},
    postTestBlockC: postTestData?.blockC || {}, postTestBlockD: postTestData?.blockD || {},
    postTestAvgA: avg(postTestData?.blockA), postTestAvgB: avg(postTestData?.blockB),
    postTestAvgC: avg(postTestData?.blockC), postTestAvgD: avg(postTestData?.blockD),
  }});

  evalAsync(sessionId, session.logs, session.caseId, postTestData || {}, finalOutput || "");
  return NextResponse.json({ ok: true });
}

async function evalAsync(sessionId: string, logs: { role: string; content: string; sequenceNumber: number }[], caseId: string, post: Record<string, Record<string, number>>, finalOutput: string) {
  try {
    const r = await runEvaluation(logs, caseId, { blockA: post.blockA||{}, blockB: post.blockB||{}, blockC: post.blockC||{}, blockD: post.blockD||{} }, finalOutput);
    const gaps = new Set(r.gaps.map(g => g.dimension));
    const ev = r.rawEvidence as Record<string, unknown>;
    await prisma.evaluation.create({ data: {
      sessionId, d1Score: r.d1Score, d2Score: r.d2Score, d3Score: r.d3Score, d4Score: r.d4Score, haiqScore: r.haiqScore,
      humanAgencyPct: r.humanAgencyPct, aiAgencyPct: 100 - r.humanAgencyPct, agencyClass: r.agencyClass,
      d1Parecer: r.d1Parecer, d2Parecer: r.d2Parecer, d3Parecer: r.d3Parecer, d4Parecer: r.d4Parecer, contextNote: r.contextNote||null,
      hasGapD1: gaps.has("D1"), hasGapD2: gaps.has("D2"), hasGapD3: gaps.has("D3"), hasGapD4: gaps.has("D4"),
      gapLabels: r.gaps.map(g=>g.label).join("; ")||null, gapsJson: r.gaps, interviewQsJson: r.interviewQs,
      evidenceD1: ev.d1_evidence as object||{}, evidenceD2: ev.d2_evidence as object||{},
      evidenceD3: ev.d3_evidence as object||{}, evidenceD4: ev.d4_evidence as object||{},
      evidenceAgency: ev.agency_index as object||{}, evaluationPath: r.evaluationPath,
    }});
  } catch (err) { console.error("Evaluation failed", sessionId, err); }
}
