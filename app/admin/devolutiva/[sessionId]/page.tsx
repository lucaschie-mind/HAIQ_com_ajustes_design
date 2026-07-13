"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Evaluation {
  d1Score: number; d2Score: number; d3Score: number; d4Score: number; haiqScore: number;
  humanAgencyPct: number; aiAgencyPct: number; agencyClass: string;
  d1Parecer: string; d2Parecer: string; d3Parecer: string; d4Parecer: string;
  contextNote?: string;
  hasGapD1: boolean; hasGapD2: boolean; hasGapD3: boolean; hasGapD4: boolean;
  gapLabels?: string;
  gapsJson: Array<{ dimension: string; label: string; signal: string; interviewerInsight: string; questions: string[] }>;
  interviewQsJson: Array<{ dimension: string; tag: string; question: string }>;
  evidenceAgency: { interpretation: string };
  evaluationPath: string; evaluatedAt: string;
}

interface Result {
  session: { id: string; candidateName: string; caseId: string; startedAt: string; completedAt: string };
  evaluation: Evaluation | null;
  logCount: number;
}

const DC: Record<string, string> = { D1: "#534AB7", D2: "#0F6E56", D3: "#185FA5", D4: "#854F0B" };
const DB: Record<string, string> = { D1: "#EEEDFE", D2: "#E1F5EE", D3: "#E6F1FB", D4: "#FAEEDA" };
const DN: Record<string, string> = { D1: "Investigação Fundamentada", D2: "Calibração Crítica", D3: "Complementaridade Estratégica", D4: "Output Criativo" };
const DI: Record<string, string> = { D1: "🔍", D2: "⚖️", D3: "🤝", D4: "💡" };

function scoreLabel(s: number): { label: string; color: string } {
  if (s >= 3.5) return { label: "Avançado", color: "#0F6E56" };
  if (s >= 2.5) return { label: "Proficiente", color: "#185FA5" };
  if (s >= 1.5) return { label: "Emergente", color: "#854F0B" };
  return { label: "Superficial", color: "#D85A30" };
}

function haiqCategory(s: number): { label: string; desc: string; color: string } {
  if (s >= 3.5) return { label: "Avançado", color: "#0F6E56", desc: "Colaboração de alto nível. Capaz de produzir outputs genuinamente criativos através da díade H-IA." };
  if (s >= 3.0) return { label: "Proficiente", color: "#185FA5", desc: "Colaboração qualificada. Extrai valor significativo da IA em contextos de complexidade moderada." };
  if (s >= 2.5) return { label: "Funcional", color: "#534AB7", desc: "Competência funcional para uso cotidiano. Gaps pontuais a endereçar." };
  if (s >= 2.0) return { label: "Em desenvolvimento", color: "#854F0B", desc: "Colaboração básica possível. Gaps significativos em pelo menos duas dimensões." };
  return { label: "Iniciante", color: "#D85A30", desc: "Requer desenvolvimento estruturado antes de atuar em funções com uso intensivo de IA." };
}

export default function AdminDevolutivaPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/results/${sessionId}`).then(r => r.json()).then(d => { setResult(d); setLoading(false); });
  }, [sessionId]);

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui" }}>Carregando...</div>;
  if (!result?.evaluation) return (
    <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui", color: "#555" }}>
      {result?.session ? "Avaliação ainda em processamento. Aguarde 1–2 minutos e recarregue." : "Sessão não encontrada."}
    </div>
  );

  const { session, evaluation } = result;
  const haiq = haiqCategory(evaluation.haiqScore);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break { page-break-before: always; }
        }
        @page { margin: 1.5cm; }
      `}</style>

      {/* Print / PDF button */}
      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 100, display: "flex", gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: "10px 20px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "system-ui" }}>
          🖨️ Gerar PDF
        </button>
        <a href={`/devolutiva/${sessionId}`} target="_blank" style={{ padding: "10px 20px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "system-ui", textDecoration: "none", display: "flex", alignItems: "center" }}>
          👤 Ver versão candidato
        </a>
      </div>

      <main style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "system-ui, -apple-system, sans-serif", paddingTop: "1rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>

          {/* Header */}
          <div style={{ background: "#042C53", borderRadius: 16, padding: "1.75rem 2rem", color: "#fff", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#85B7EB", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6 }}>HAI-Q · Relatório Completo — Uso Restrito RH</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{session.candidateName}</div>
                <div style={{ fontSize: 13, color: "#aaa" }}>
                  Case: {session.caseId} · {result.logCount} turnos · {Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)} min · {new Date(session.completedAt).toLocaleString("pt-BR")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: "#378ADD", lineHeight: 1 }}>{evaluation.haiqScore.toFixed(1)}</div>
                <div style={{ fontSize: 12, color: "#85B7EB" }}>HAI-Q Score</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: haiq.color, marginTop: 4 }}>{haiq.label}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>
              {haiq.desc}
            </div>
          </div>

          {/* Score grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "1.25rem" }}>
            {(["D1","D2","D3","D4"] as const).map(dim => {
              const score = evaluation[`${dim.toLowerCase()}Score` as "d1Score"];
              const sl = scoreLabel(score);
              return (
                <div key={dim} style={{ background: "#fff", borderRadius: 12, padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `3px solid ${DC[dim]}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DC[dim], textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>{DI[dim]} {dim}</div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{DN[dim]}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: DC[dim], lineHeight: 1 }}>{score.toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: sl.color, fontWeight: 600, marginTop: 4 }}>{sl.label}</div>
                  <div style={{ height: 4, background: "#e0e7ef", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ width: `${(score / 4) * 100}%`, height: "100%", background: DC[dim], borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agency */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#042C53", marginBottom: 10 }}>Índice de Agência Humana</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: "#534AB7" }}>Candidato — {evaluation.humanAgencyPct.toFixed(0)}%</span>
              <span style={{ fontWeight: 600, color: "#0F6E56" }}>IA — {evaluation.aiAgencyPct.toFixed(0)}%</span>
            </div>
            <div style={{ height: 12, background: "#e0e7ef", borderRadius: 6, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${evaluation.humanAgencyPct}%`, background: "#534AB7" }} />
              <div style={{ flex: 1, background: "#0F6E56" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
              <span style={{ fontWeight: 600 }}>Classificação:</span> {evaluation.agencyClass}
              {evaluation.evidenceAgency?.interpretation && <span> · {evaluation.evidenceAgency.interpretation}</span>}
            </div>
          </div>

          {/* Pareceres */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#042C53", marginBottom: "1rem" }}>Pareceres por Dimensão</div>
            {(["D1","D2","D3","D4"] as const).map(dim => (
              <div key={dim} style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid #f0f4f8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: DB[dim], color: DC[dim] }}>{dim} · {DN[dim]}</span>
                  <span style={{ fontSize: 11, color: scoreLabel(evaluation[`${dim.toLowerCase()}Score` as "d1Score"]).color, fontWeight: 600 }}>
                    {evaluation[`${dim.toLowerCase()}Score` as "d1Score"].toFixed(1)} · {scoreLabel(evaluation[`${dim.toLowerCase()}Score` as "d1Score"]).label}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#333", lineHeight: 1.7, margin: 0 }}>{evaluation[`${dim.toLowerCase()}Parecer` as "d1Parecer"]}</p>
              </div>
            ))}
            {evaluation.contextNote && (
              <div style={{ background: "#FFF8E1", borderLeft: "3px solid #EF9F27", padding: "10px 14px", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#444", lineHeight: 1.6 }}>
                <strong>Nota de contexto:</strong> {evaluation.contextNote}
              </div>
            )}
          </div>

          {/* Gaps */}
          {evaluation.gapsJson?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#042C53", marginBottom: "1rem" }}>Gaps Identificados</div>
              {evaluation.gapsJson.map((gap, i) => (
                <div key={i} style={{ background: DB[gap.dimension] || "#f8f9fb", borderRadius: 10, padding: "14px 16px", marginBottom: "0.75rem", borderLeft: `3px solid ${DC[gap.dimension] || "#185FA5"}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: DC[gap.dimension] || "#185FA5", marginBottom: 6 }}>
                    {DI[gap.dimension]} {gap.dimension} · {gap.label}
                  </div>
                  <p style={{ fontSize: 13, color: "#444", margin: "0 0 6px", lineHeight: 1.5 }}><strong>Sinal observado:</strong> {gap.signal}</p>
                  <p style={{ fontSize: 13, color: "#444", margin: 0, lineHeight: 1.5 }}><strong>Insight para o entrevistador:</strong> {gap.interviewerInsight}</p>
                </div>
              ))}
            </div>
          )}

          {/* Interview questions */}
          {evaluation.gapsJson?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} className="page-break">
              <div style={{ fontSize: 14, fontWeight: 700, color: "#042C53", marginBottom: "1rem" }}>Perguntas Sugeridas para Entrevista</div>
              {evaluation.gapsJson.map((gap, i) => (
                <div key={i} style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DC[gap.dimension], textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
                    {gap.dimension} · {gap.label}
                  </div>
                  {gap.questions.map((q, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: DB[gap.dimension], color: DC[gap.dimension], whiteSpace: "nowrap" as const }}>
                        {j === 0 ? "Explora" : "Sonda"}
                      </span>
                      <p style={{ fontSize: 13, color: "#333", margin: 0, lineHeight: 1.6 }}>{q}</p>
                    </div>
                  ))}
                </div>
              ))}
              {evaluation.interviewQsJson?.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#E1F5EE", color: "#0F6E56", whiteSpace: "nowrap" as const }}>
                    {q.dimension} · {q.tag}
                  </span>
                  <p style={{ fontSize: 13, color: "#333", margin: 0, lineHeight: 1.6 }}>{q.question}</p>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "1rem 1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
            <div style={{ fontSize: 11, color: "#aaa" }}>
              HAI-Q Assessment Framework · {evaluation.evaluationPath} · Avaliado em {new Date(evaluation.evaluatedAt).toLocaleString("pt-BR")}
            </div>
            <div style={{ fontSize: 11, color: "#aaa" }}>Session ID: {session.id.slice(0, 8)}...</div>
          </div>

        </div>
      </main>
    </>
  );
}
