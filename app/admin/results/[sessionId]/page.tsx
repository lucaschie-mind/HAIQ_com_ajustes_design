"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Evaluation {
  d1Score: number; d2Score: number; d3Score: number; d4Score: number; haiqScore: number;
  humanAgencyPct: number; agencyClass: string;
  d1Parecer: string; d2Parecer: string; d3Parecer: string; d4Parecer: string;
  contextNote?: string;
  hasGapD1: boolean; hasGapD2: boolean; hasGapD3: boolean; hasGapD4: boolean; gapLabels?: string;
  gaps: Array<{ dimension: string; label: string; signal: string; interviewerInsight: string; questions: string[] }>;
  interviewQs: Array<{ dimension: string; tag: string; question: string }>;
  evaluationPath: string; evaluatedAt: string;
}

const DC: Record<string, string> = { D1: "#534AB7", D2: "#0F6E56", D3: "#185FA5", D4: "#854F0B" };
const DN: Record<string, string> = { D1: "Investigação", D2: "Calibração", D3: "Complementaridade", D4: "Output criativo" };

export default function AdminResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<{ session: { candidateName: string; caseId: string; completedAt: string }; evaluation: Evaluation | null; logCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetch(`/api/results/${sessionId}`).then(r => r.json()).then(d => { setResult(d); setLoading(false); });
    load();
    const t = setInterval(() => { if (!result?.evaluation) load(); }, 5000);
    return () => clearInterval(t);
  }, [sessionId]);

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui", color: "#555" }}>Carregando...</div>;
  if (!result) return <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui", color: "#D85A30" }}>Sessão não encontrada.</div>;

  const { session, evaluation } = result;

  return (
    <main style={{ minHeight: "100vh", background: "#f0f4f8", padding: "2rem 1rem", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <div style={{ background: "#042C53", borderRadius: 16, padding: "1.5rem 2rem", color: "#fff", marginBottom: "1rem" }}>
          <div style={{ fontSize: 12, color: "#85B7EB", marginBottom: 6 }}>HAI-Q · Relatório de Avaliação</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{session.candidateName}</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>Case: {session.caseId} · {result.logCount} turnos · {session.completedAt ? new Date(session.completedAt).toLocaleString("pt-BR") : "Em andamento"}</div>
        </div>

        {!evaluation ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: "2rem", textAlign: "center", color: "#555" }}>
            <div style={{ fontSize: 32, marginBottom: "1rem" }}>⏳</div>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Avaliação em processamento...</p>
            <p style={{ fontSize: 13, color: "#888" }}>Cerca de 1–2 minutos. A página atualiza automaticamente.</p>
          </div>
        ) : (
          <>
            <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>HAI-Q Score</div>
                <div style={{ fontSize: 52, fontWeight: 700, color: "#185FA5", lineHeight: 1 }}>{evaluation.haiqScore?.toFixed(1)}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>escala 1–4</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Agência humana</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0F6E56" }}>{evaluation.humanAgencyPct?.toFixed(0)}%</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{evaluation.agencyClass}</div>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#042C53", margin: "0 0 1.25rem" }}>Scores por dimensão</h2>
              {(["D1","D2","D3","D4"] as const).map(dim => {
                const score = evaluation[`${dim.toLowerCase()}Score` as "d1Score"];
                return (
                  <div key={dim} style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DC[dim], marginBottom: 4 }}>{dim} · {DN[dim]}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: "#e0e7ef", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${((score||0)/4)*100}%`, height: "100%", background: DC[dim], borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: DC[dim], minWidth: 32 }}>{score?.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#042C53", margin: "0 0 1.25rem" }}>Pareceres</h2>
              {(["d1","d2","d3","d4"] as const).map(dim => (
                <div key={dim} style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid #f0f4f8" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: DC[dim.toUpperCase()], textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{dim.toUpperCase()} · {DN[dim.toUpperCase()]}</div>
                  <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0 }}>{evaluation[`${dim}Parecer` as "d1Parecer"]}</p>
                </div>
              ))}
              {evaluation.contextNote && <div style={{ background: "#FFF3E0", borderLeft: "3px solid #EF9F27", padding: "10px 14px", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#333" }}>{evaluation.contextNote}</div>}
            </div>

            {evaluation.gaps?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#042C53", margin: "0 0 1.25rem" }}>Gaps — aprofundar na entrevista</h2>
                {evaluation.gaps.map((gap, i) => (
                  <div key={i} style={{ background: "#f8f9fb", borderRadius: 8, padding: 14, marginBottom: "0.75rem", borderLeft: `3px solid ${DC[gap.dimension]||"#185FA5"}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: DC[gap.dimension]||"#185FA5", marginBottom: 4 }}>{gap.dimension} · {gap.label}</div>
                    <p style={{ fontSize: 13, color: "#555", margin: "0 0 6px" }}><strong>Sinal:</strong> {gap.signal}</p>
                    <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px" }}><strong>Insight:</strong> {gap.interviewerInsight}</p>
                    {gap.questions.map((q, j) => <div key={j} style={{ background: "#fff", borderRadius: 6, padding: "8px 12px", marginTop: 6, fontSize: 13, color: "#333", border: "1px solid #e0e7ef" }}>💬 {q}</div>)}
                  </div>
                ))}
              </div>
            )}

            {evaluation.interviewQs?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#042C53", margin: "0 0 1.25rem" }}>Perguntas confirmatórias</h2>
                {evaluation.interviewQs.map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#E1F5EE", color: "#0F6E56", whiteSpace: "nowrap" }}>{q.dimension} · {q.tag}</span>
                    <p style={{ fontSize: 13, color: "#333", margin: 0, lineHeight: 1.6 }}>{q.question}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", padding: "1rem" }}>
              {evaluation.evaluationPath} · {new Date(evaluation.evaluatedAt).toLocaleString("pt-BR")}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
