import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CASES } from "@/lib/cases";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 });

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const { sessionId, message, retry } = await req.json();
  if (!sessionId || !message) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { logs: { orderBy: { sequenceNumber: "asc" } } } });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.completedAt) return NextResponse.json({ error: "Session completed" }, { status: 400 });

  const caseData = CASES[session.caseId];
  if (!caseData) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  const tDb = Date.now() - t0;

  // Em retry, a mensagem do candidato pode já ter sido gravada no turno que falhou — não regravar.
  const lastLog = session.logs[session.logs.length - 1];

  // Cliente caiu DEPOIS de o servidor completar e gravar (queda silenciosa de rede):
  // devolve a resposta já armazenada em vez de regenerar — re-sincroniza a tela com o
  // log sem duplicar mensagem nem gerar resposta que o avaliador veria em dobro.
  if (retry === true && lastLog?.role === "AI") {
    const prevCandidate = session.logs[session.logs.length - 2];
    if (prevCandidate?.role === "CANDIDATE" && prevCandidate.content === message) {
      console.log(JSON.stringify({ evt: "chat_turn", sessionId, outcome: "replayed", retry: true, historyTurns: session.logs.length, tDbMs: tDb, tFirstTokenMs: null, tTotalMs: Date.now() - t0 }));
      return new Response(lastLog.content, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
    }
  }
  const isRegeneration = retry === true && lastLog?.role === "CANDIDATE" && lastLog.content === message;
  const logs: { role: string; content: string }[] = [...session.logs];
  if (!isRegeneration) {
    await prisma.log.create({ data: { sessionId, sequenceNumber: logs.length + 1, role: "CANDIDATE", content: message } });
    logs.push({ role: "CANDIDATE", content: message });
  }

  // A API exige roles alternados; após uma falha o log pode ter turnos CANDIDATE consecutivos.
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const l of logs) {
    const role = l.role === "CANDIDATE" ? ("user" as const) : ("assistant" as const);
    const prev = history[history.length - 1];
    if (prev && prev.role === role) prev.content += "\n\n" + l.content;
    else history.push({ role, content: l.content });
  }

  const aiSeq = logs.length + 1;
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      let tFirst: number | null = null;
      const logTurn = (outcome: string, error?: string) =>
        console.log(JSON.stringify({ evt: "chat_turn", sessionId, outcome, retry: isRegeneration, historyTurns: history.length, tDbMs: tDb, tFirstTokenMs: tFirst && tFirst - t0, tTotalMs: Date.now() - t0, error }));
      try {
        const aiStream = anthropic.messages.stream(
          { model: "claude-sonnet-4-6", max_tokens: 1000, system: caseData.systemPrompt, messages: history },
          { signal: abort.signal },
        );
        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            tFirst = tFirst ?? Date.now();
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // Grava somente com o stream completo — resposta parcial nunca vira registro no log.
        await prisma.log.create({ data: { sessionId, sequenceNumber: aiSeq, role: "AI", content: full } });
        logTurn("success");
        controller.close();
      } catch (err) {
        logTurn(abort.signal.aborted ? "aborted" : "error", err instanceof Error ? err.message : String(err));
        try { controller.error(err); } catch { /* cliente já desconectou */ }
      }
    },
    cancel() { abort.abort(); },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
}
