"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

const BLOCKS = [
  { id: "blockA", title: "Experiência com IA", color: "#185FA5", questions: [
    { id: "a1", text: "Com que frequência utilizo ferramentas de IA no trabalho ou estudos atualmente." },
    { id: "a2", text: "Me considero familiarizado com ferramentas como ChatGPT, Claude ou similares." },
  ]},
  { id: "blockB", title: "Percepção da sessão", color: "#0F6E56", questions: [
    { id: "b1", text: "A IA foi útil para explorar o problema desta sessão." },
    { id: "b2", text: "Me senti confiante interagindo com a IA durante o desafio." },
  ]},
  { id: "blockC", title: "Conforto durante a sessão", color: "#854F0B", questions: [
    { id: "c1", text: "Me senti à vontade para explorar diferentes abordagens sem medo de errar." },
    { id: "c2", text: "Senti ansiedade ou pressão durante a interação com a IA." },
  ]},
  { id: "blockD", title: "Relevância percebida", color: "#534AB7", questions: [
    { id: "d1", text: "Este tipo de desafio é próximo do que enfrento (ou enfrentarei) no trabalho." },
    { id: "d2", text: "Usaria IA para resolver um problema como esse no meu dia a dia profissional." },
  ]},
];

export default function CompletePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const total = BLOCKS.reduce((acc, b) => acc + b.questions.length, 0);
  const answered = Object.keys(answers).length;

  async function handleSubmit() {
    if (answered < total) return;
    setSubmitting(true);
    const postTestData: Record<string, Record<string, number>> = {};
    BLOCKS.forEach(b => { postTestData[b.id] = {}; b.questions.forEach(q => { postTestData[b.id][q.id] = answers[q.id]; }); });
    await fetch("/api/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, postTestData }) });
    router.push(`/done/${sessionId}`);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f0f4f8", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", maxWidth: 600, width: "100%", overflow: "hidden" }}>
        <div style={{ background: "#042C53", padding: "1.5rem 2rem", color: "#fff" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#378ADD", marginBottom: 8 }}>HAI-Q</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>Quase lá — só mais algumas perguntas</h1>
          <p style={{ fontSize: 14, color: "#85B7EB", margin: 0 }}>Leva menos de 3 minutos. Suas respostas contextualizam a avaliação.</p>
        </div>

        <div style={{ padding: "1rem 2rem 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: "#e0e7ef", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${(answered / total) * 100}%`, height: "100%", background: "#185FA5", borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 13, color: "#555" }}>{answered}/{total}</span>
          </div>
        </div>

        <div style={{ padding: "1rem 2rem" }}>
          {BLOCKS.map(block => (
            <div key={block.id} style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid #f0f4f8" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: block.color, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 1rem" }}>{block.title}</h2>
              {block.questions.map(q => (
                <div key={q.id} style={{ marginBottom: "1.25rem" }}>
                  <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6, margin: "0 0 0.75rem" }}>{q.text}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1,2,3,4,5].map(val => (
                      <button key={val} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))} style={{ width: 44, height: 44, border: `1.5px solid ${answers[q.id] === val ? block.color : "#ddd"}`, borderRadius: 8, background: answers[q.id] === val ? block.color : "#fff", color: answers[q.id] === val ? "#fff" : "#333", fontSize: 15, cursor: "pointer", fontWeight: answers[q.id] === val ? 700 : 400 }}>
                        {val}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 4 }}>
                    <span>Discordo totalmente</span><span>Concordo totalmente</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: "0 2rem 2rem" }}>
          <button style={{ width: "100%", padding: 14, background: answered < total || submitting ? "#93b8d8" : "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: answered < total || submitting ? "not-allowed" : "pointer" }} onClick={handleSubmit} disabled={answered < total || submitting}>
            {submitting ? "Enviando..." : "Concluir assessment →"}
          </button>
          {answered < total && <p style={{ textAlign: "center", fontSize: 13, color: "#888", marginTop: 8 }}>Responda todas as perguntas para continuar.</p>}
        </div>
      </div>
    </main>
  );
}
