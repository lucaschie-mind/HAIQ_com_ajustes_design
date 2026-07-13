"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function formatStart(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function relativeTime(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumable, setResumable] = useState<{ sessionId: string; caseTitle: string; startedAt: string; lastSavedAt: string } | null>(null);
  const router = useRouter();

  async function createSession(forceNew: boolean) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, ...(forceNew ? { forceNew: true } : {}) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.resumable) {
        setResumable(data.resumable);
        setLoading(false);
        return;
      }
      router.push(`/assessment/${data.sessionId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar.");
      setLoading(false);
    }
  }

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    createSession(false);
  }

  // Tela dedicada: escolher entre retomar o teste em andamento ou começar do zero.
  if (resumable) {
    return (
      <main style={{ minHeight: "100vh", padding: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "#eef1f5" }}>
        <div style={{ width: 452, maxWidth: "100%", boxSizing: "border-box", background: "#fff", borderRadius: 16, padding: "40px 40px 32px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 1px 2px rgba(0,0,0,.03), 0 6px 16px rgba(15,43,72,.08), 0 12px 48px rgba(15,43,72,.06)" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, color: "#185FA5" }}>HAI-Q</div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 20, padding: "5px 12px 5px 10px", background: "#eaf1fb", borderRadius: 999 }}>
            <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
              <span className="pulse-dot" style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#185FA5" }} />
              <span style={{ position: "relative", width: 8, height: 8, borderRadius: 999, background: "#185FA5" }} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".02em", color: "#185FA5" }}>Teste em andamento</span>
          </div>

          <h2 style={{ margin: "18px 0 0", textAlign: "center", fontSize: 22, fontWeight: 700, lineHeight: 1.3, color: "#042C53" }}>Você parou no meio de uma sessão</h2>
          <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 14, lineHeight: 1.6, color: "rgba(0,0,0,.6)", maxWidth: 340 }}>Sua conversa está salva — você pode voltar exatamente de onde parou.</p>

          <div style={{ width: "100%", boxSizing: "border-box", marginTop: 24, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#f7f8fa", borderRadius: 10, boxShadow: "inset 0 0 0 1px #f0f0f0" }}>
            <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#185FA5", boxShadow: "inset 0 0 0 1px #e4e9f0" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,.82)" }}>Iniciado em {formatStart(resumable.startedAt)}</span>
              <span style={{ fontSize: 12, color: "rgba(0,0,0,.45)" }}>Salvo automaticamente {relativeTime(resumable.lastSavedAt)}</span>
            </div>
          </div>

          {error && <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 13, color: "#cf1322" }}>{error}</p>}

          <button className="resume-primary" disabled={loading} onClick={() => router.push(`/assessment/${resumable.sessionId}`)} style={{ width: "100%", height: 48, marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: loading ? "#93b8d8" : "#185FA5", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(24,95,165,.28)", transition: "background 0.15s cubic-bezier(.645,.045,.355,1)" }}>
            Continuar de onde parei
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>

          <div style={{ width: "100%", marginTop: 20, height: 1, background: "#f0f0f0" }} />

          <button className="resume-secondary" disabled={loading} onClick={() => createSession(true)} style={{ width: "100%", height: 42, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", border: "1px solid #e4e6ea", borderRadius: 10, color: "rgba(0,0,0,.6)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer", transition: "border-color 0.15s cubic-bezier(.645,.045,.355,1), color 0.15s cubic-bezier(.645,.045,.355,1), background 0.15s cubic-bezier(.645,.045,.355,1)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
            {loading ? "Iniciando..." : "Começar do zero"}
          </button>
          <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, lineHeight: 1.5, color: "rgba(0,0,0,.4)", maxWidth: 360 }}>Ao começar do zero, um novo desafio é sorteado e o teste anterior é descartado.</p>
        </div>
        <style jsx>{`
          .pulse-dot { animation: haiqPulse 2s cubic-bezier(.645,.045,.355,1) infinite; }
          @keyframes haiqPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(2.6); opacity: 0; } }
          @media (prefers-reduced-motion: reduce) { .pulse-dot { animation: none; } }
          .resume-primary:not(:disabled):hover { background: #378ADD !important; }
          .resume-primary:not(:disabled):active { background: #042C53 !important; }
          .resume-secondary:not(:disabled):hover { border-color: #ffccc7 !important; color: #cf1322 !important; background: #fff5f4 !important; }
        `}</style>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f8", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", maxWidth: 520, width: "100%", overflow: "hidden" }}>
        <div style={{ background: "#042C53", padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 700, color: "#378ADD", letterSpacing: 3 }}>HAI-Q</div>
          <div style={{ fontSize: 14, color: "#85B7EB", marginTop: 4 }}>Human–AI Intelligence Quotient</div>
        </div>
        <div style={{ padding: "1.5rem 2rem" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#042C53", margin: "0 0 0.5rem" }}>Assessment de Colaboração com IA</h1>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 1rem" }}>
            Neste desafio, você trabalhará junto com uma IA para analisar um problema organizacional real e construir um <strong>plano de ação</strong>.
          </p>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
Não existe resposta certa. O HAI-Q avalia como você <strong>colabora</strong> com a IA, não o quanto você sabe sobre ela. Queremos entender como você investiga o problema, utiliza as informações disponíveis e constrói sua proposta.
          </p>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#042C53", margin: "0 0 0.6rem" }}>Como funciona</h2>
          <div style={{ marginBottom: "1.25rem" }}>
            {[
              "Leia o problema apresentado. Fique tranquilo(a): você poderá consultá-lo novamente durante todo o desafio.",
              "Converse livremente com a IA e explore as informações disponíveis.",
              "Use os aprendizados da conversa para elaborar seu plano de ação.",
              "Envie seu plano de ação e pronto — sua sessão é avaliada.",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", margin: "0.5rem 0" }}>
                <span style={{ background: "#D6E8F9", color: "#185FA5", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 0.5rem" }}>Não há tempo limite para a resolução, sendo a média, aproximadamente, 30 minutos.</p>
          <p style={{ fontSize: 14, color: "#042C53", fontWeight: 700, margin: "0 0 1.25rem" }}>Bom desafio!</p>
          <form onSubmit={handleStart}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>Nome completo</label>
              <input style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required disabled={loading} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>E-mail</label>
              <input style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required disabled={loading} />
            </div>
            {error && <p style={{ color: "#D85A30", fontSize: 14, marginBottom: "0.75rem" }}>{error}</p>}
            <button style={{ width: "100%", padding: 13, background: loading ? "#93b8d8" : "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }} type="submit" disabled={loading}>
              {loading ? "Iniciando..." : "Começar o assessment →"}
            </button>
          </form>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
            {["⏱ ~30 minutos", "💬 Chat com IA", "📋 Problema aberto"].map(t => (
              <span key={t} style={{ fontSize: 13, color: "#555" }}>{t}</span>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#888", marginTop: "1rem" }}>Sua interação será gravada e avaliada. Resultados são confidenciais.</p>
        </div>
      </div>
    </main>
  );
}
