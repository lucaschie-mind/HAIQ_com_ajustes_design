"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Evaluation {
  d1Score: number; d2Score: number; d3Score: number; d4Score: number; haiqScore: number;
  humanAgencyPct: number; agencyClass: string;
  d1Parecer: string; d2Parecer: string; d3Parecer: string; d4Parecer: string;
  contextNote?: string;
  gapsJson: Array<{ dimension: string; label: string; signal: string; interviewerInsight: string; questions: string[] }>;
  evaluatedAt: string;
}

interface SessionData {
  candidateName: string;
  caseId: string;
  caseTitle: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
}

interface Result {
  session: SessionData;
  evaluation: Evaluation | null;
  logCount: number;
}

const DIMS = [
  {
    key: "d1",
    label: "Investigação Fundamentada",
    icon: "🔍",
    color: "#534AB7",
    bg: "#EEEDFE",
    description: "Como você explorou e construiu entendimento sobre o problema — a qualidade das perguntas que fez e a progressão do seu raciocínio ao longo da sessão.",
  },
  {
    key: "d2",
    label: "Calibração Crítica",
    icon: "⚖️",
    color: "#0F6E56",
    bg: "#E1F5EE",
    description: "Como você avaliou e filtrou as respostas da IA — sua capacidade de identificar quando concordar, adaptar ou questionar o que foi sugerido.",
  },
  {
    key: "d3",
    label: "Complementaridade Estratégica",
    icon: "🤝",
    color: "#185FA5",
    bg: "#E6F1FB",
    description: "Como você distribuiu o trabalho entre você e a IA — o que delegou, o que reservou para seu próprio julgamento e como usou os pontos fortes de cada lado.",
  },
  {
    key: "d4",
    label: "Output Criativo",
    icon: "💡",
    color: "#854F0B",
    bg: "#FAEEDA",
    description: "A qualidade da perspectiva ou plano que você construiu — se foi original, bem fundamentado e se aproveitou o que só a combinação entre você e a IA poderia produzir.",
  },
];

function AgencyBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ margin: "0.5rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color }}>Você — {pct.toFixed(0)}%</span>
        <span style={{ color: "#0F6E56", fontWeight: 600 }}>IA — {(100 - pct).toFixed(0)}%</span>
      </div>
      <div style={{ height: 10, background: "#e0e7ef", borderRadius: 5, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${pct}%`, background: color, borderRadius: "5px 0 0 5px", transition: "width 1s ease" }} />
        <div style={{ flex: 1, background: "#0F6E56", borderRadius: "0 5px 5px 0" }} />
      </div>
    </div>
  );
}

export default function DevolutivaPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);

  useEffect(() => {
    fetch(`/api/results/${sessionId}`)
      .then(r => r.json())
      .then(d => {
        setResult(d);
        setLoading(false);
        if (d.session && !d.evaluation) setNotReady(true);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) return (
    <main style={s.main}>
      <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Carregando sua devolutiva...</div>
    </main>
  );

  if (!result?.session) return (
    <main style={s.main}>
      <div style={{ textAlign: "center", padding: "4rem", color: "#D85A30" }}>Sessão não encontrada.</div>
    </main>
  );

  if (notReady || !result.evaluation) return (
    <main style={s.main}>
      <div style={{ ...s.card, textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>⏳</div>
        <h2 style={{ fontSize: 22, color: "#042C53", margin: "0 0 1rem" }}>Sua devolutiva está sendo preparada</h2>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.6 }}>A avaliação leva alguns minutos. Você receberá um link quando estiver pronta.</p>
      </div>
    </main>
  );

  const { session, evaluation } = result;
  const name = session.candidateName.split(" ")[0];

  return (
    <main style={s.main}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Header */}
        <div style={{ ...s.card, background: "#042C53", color: "#fff", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 13, color: "#85B7EB", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" as const }}>HAI-Q · Devolutiva</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>Olá, {name}!</h1>
          <p style={{ fontSize: 14, color: "#9FE1CB", margin: "0 0 16px", lineHeight: 1.5 }}>
            Aqui está o resultado do seu assessment de colaboração com IA. Esta devolutiva reflete como você pensou e interagiu durante o desafio <strong style={{ color: "#fff" }}>{session.caseTitle}</strong>.
          </p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const }}>
            {[
              `📅 ${new Date(session.completedAt).toLocaleDateString("pt-BR")}`,
              `⏱ ${Math.round(session.durationSeconds / 60)} minutos`,
              `💬 ${result.logCount} turnos de conversa`,
            ].map(t => <span key={t} style={{ fontSize: 13, color: "#aaa" }}>{t}</span>)}
          </div>
        </div>

        {/* Metodologia */}
        <div style={{ ...s.card, marginBottom: "1.5rem" }}>
          <h2 style={s.sectionTitle}>O que é o HAI-Q?</h2>
          <p style={s.bodyText}>
            O HAI-Q (Human–AI Intelligence Quotient) avalia sua capacidade de colaborar com Inteligência Artificial para resolver problemas reais. Não mede conhecimento técnico sobre IA — mede como você pensa <em>junto</em> com ela.
          </p>
          <p style={s.bodyText}>
            A avaliação é feita a partir do log da sua conversa com a IA embarcada. Um pipeline de agentes analisa a trajetória das suas perguntas, como você filtrou as respostas recebidas, como distribuiu o trabalho entre você e a IA, e a qualidade do output final que você produziu.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: "1rem" }}>
            {DIMS.map(d => (
              <div key={d.key} style={{ background: d.bg, borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${d.color}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: d.color, marginBottom: 4 }}>{d.icon} {d.label}</div>
                <div style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>{d.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Agência */}
        <div style={{ ...s.card, marginBottom: "1.5rem" }}>
          <h2 style={s.sectionTitle}>Como foi a colaboração?</h2>
          <p style={s.bodyText}>
            O <strong>Índice de Agência</strong> mostra quanto do resultado final veio do seu julgamento versus do que a IA trouxe. O equilíbrio entre os dois é o que define uma boa colaboração — nem delegar tudo, nem ignorar o que a IA oferece.
          </p>
          <AgencyBar pct={evaluation.humanAgencyPct} color="#534AB7" />
          <p style={{ fontSize: 13, color: "#555", marginTop: 8, lineHeight: 1.5 }}>
            {evaluation.agencyClass === "BALANCED"
              ? "Sua colaboração foi bem equilibrada — você usou a IA para ampliar seu raciocínio sem abrir mão do seu julgamento."
              : evaluation.agencyClass === "HUMAN_DOMINANT" || evaluation.agencyClass === "HUMAN_LED"
              ? "Você conduziu bastante o raciocínio. Em alguns momentos, explorar mais o que a IA pode trazer poderia ter enriquecido o resultado."
              : "A IA teve papel predominante na construção do resultado. Desenvolver mais sua capacidade de filtrar e adaptar o que ela oferece é o principal ponto de crescimento."}
          </p>
        </div>

        {/* Pareceres por dimensão */}
        <div style={{ ...s.card, marginBottom: "1.5rem" }}>
          <h2 style={s.sectionTitle}>O que foi observado</h2>
          <p style={{ ...s.bodyText, marginBottom: "1.5rem" }}>A seguir, o que o avaliador identificou em cada uma das quatro dimensões a partir da sua interação.</p>
          {DIMS.map(d => {
            const parecer = evaluation[`${d.key}Parecer` as "d1Parecer"];
            return (
              <div key={d.key} style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid #f0f4f8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{d.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: d.color }}>{d.label}</span>
                </div>
                <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0 }}>{parecer}</p>
              </div>
            );
          })}
          {evaluation.contextNote && (
            <div style={{ background: "#FFF8E1", borderLeft: "3px solid #EF9F27", padding: "12px 14px", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#444", lineHeight: 1.6 }}>
              <strong>Contexto adicional:</strong> {evaluation.contextNote}
            </div>
          )}
        </div>

        {/* Pontos de desenvolvimento */}
        {evaluation.gapsJson?.length > 0 && (
          <div style={{ ...s.card, marginBottom: "1.5rem" }}>
            <h2 style={s.sectionTitle}>Pontos de desenvolvimento</h2>
            <p style={{ ...s.bodyText, marginBottom: "1.25rem" }}>Estas são as áreas onde há maior espaço para crescimento na sua forma de colaborar com IA.</p>
            {evaluation.gapsJson.map((gap, i) => {
              const dim = DIMS.find(d => d.key === gap.dimension.toLowerCase()) || DIMS[0];
              return (
                <div key={i} style={{ background: dim.bg, borderRadius: 10, padding: "14px 16px", marginBottom: "0.75rem", borderLeft: `3px solid ${dim.color}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: dim.color, marginBottom: 6 }}>{dim.icon} {gap.label}</div>
                  <p style={{ fontSize: 13, color: "#444", lineHeight: 1.6, margin: 0 }}>{gap.interviewerInsight}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center" as const, padding: "1rem", fontSize: 12, color: "#aaa" }}>
          HAI-Q Assessment · {new Date(evaluation.evaluatedAt).toLocaleDateString("pt-BR")}
        </div>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  main: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "system-ui, -apple-system, sans-serif" },
  card: { background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)", padding: "1.5rem 2rem" },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: "#042C53", margin: "0 0 0.75rem" },
  bodyText: { fontSize: 14, color: "#444", lineHeight: 1.7, margin: "0 0 0.75rem" },
};
