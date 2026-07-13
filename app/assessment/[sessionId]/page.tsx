"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { CASES } from "@/lib/cases";
import { LockOutlined, EditOutlined, InfoCircleOutlined, CloseOutlined, ArrowRightOutlined } from "@ant-design/icons";

interface Message { role: "CANDIDATE" | "AI"; content: string; error?: boolean; }

const MIN_EXCHANGES_TO_FINISH = 4;

export default function AssessmentPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"briefing" | "chat">("briefing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [finalOutput, setFinalOutput] = useState("");
  const [finishError, setFinishError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/results/${sessionId}`).then(r => r.json()).then(d => {
      if (!d.session) { router.push("/"); return; }
      if (d.session.completedAt) { router.push(`/done/${sessionId}`); return; }
      const logs: Message[] = (d.logs ?? []).map((l: { role: string; content: string }) => ({ role: l.role === "CANDIDATE" ? "CANDIDATE" as const : "AI" as const, content: l.content }));
      // Caiu entre enviar o plano final e concluir o pós-teste: retoma direto no pós-teste.
      if (logs.some(l => l.role === "CANDIDATE" && l.content.startsWith("[PLANO FINAL]"))) { router.push(`/complete/${sessionId}`); return; }
      if (logs.length > 0) { setMessages(logs); setPhase("chat"); }
      setCaseId(d.session.caseId);
    }).catch(() => router.push("/"));
  }, [sessionId, router]);

  // Rascunho do plano sobrevive a recarregamento/queda — vive só no navegador, por sessão.
  const draftKey = `haiq-plan-draft-${sessionId}`;
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) setFinalOutput(saved);
  }, [draftKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const caseData = caseId ? CASES[caseId] : null;
  // Resposta ainda em streaming não conta como troca — só ao completar.
  const exchangesCount = messages.filter((m, i) => m.role === "AI" && !m.error && !(sending && i === messages.length - 1)).length;
  const canFinish = exchangesCount >= MIN_EXCHANGES_TO_FINISH;
  const progressPct = (Math.min(exchangesCount, MIN_EXCHANGES_TO_FINISH) / MIN_EXCHANGES_TO_FINISH) * 100;
  const remainingExchanges = MIN_EXCHANGES_TO_FINISH - exchangesCount;

  async function runTurn(msg: string, isRetry: boolean) {
    setSending(true);
    const base: Message[] = messages.filter(m => !m.error);
    if (!isRetry) base.push({ role: "CANDIDATE", content: msg });
    setMessages(base);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, message: msg, ...(isRetry ? { retry: true } : {}) }) });
      if (!res.ok || !res.body) throw new Error("request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...base, { role: "AI", content: acc }]);
      }
      if (!acc.trim()) throw new Error("empty response");
    } catch {
      // Parcial é descartado da tela — o turno que falhou não existe no log nem conta como troca.
      setMessages([...base, { role: "AI", content: "Não foi possível gerar a resposta agora.", error: true }]);
    } finally { setSending(false); }
  }

  function sendMessage() {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    runTurn(msg, false);
  }

  function retryTurn() {
    if (sending) return;
    const lastCandidate = [...messages].reverse().find(m => m.role === "CANDIDATE");
    if (lastCandidate) runTurn(lastCandidate.content, true);
  }

  async function handleFinish() {
    if (!finalOutput.trim() || sending) return;
    setSending(true);
    setFinishError(false);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, message: `[PLANO FINAL]\n\n${finalOutput}` }) });
      if (!res.ok || !res.body) throw new Error("request failed");
      const reader = res.body.getReader();
      while (true) { const { done } = await reader.read(); if (done) break; }
      localStorage.removeItem(draftKey);
      router.push(`/complete/${sessionId}`);
    } catch { setFinishError(true); setSending(false); }
  }

  if (!caseData) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#555" }}>Carregando...</div>;

  if (phase === "briefing") {
    return (
      <main style={{ minHeight: "100vh", background: "#f0f4f8", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem" }}>
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", maxWidth: 680, width: "100%", overflow: "hidden" }}>
          <div style={{ background: "#042C53", padding: "2rem", color: "#fff" }}>
            <div style={{ fontSize: 11, color: "#85B7EB", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{caseData.id} · {caseData.domain}</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>{caseData.title}</h1>
            <p style={{ fontSize: 14, color: "#9FE1CB", margin: 0 }}>{caseData.subtitle}</p>
          </div>
          <div style={{ padding: "1.5rem 2rem 2rem" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#185FA5", margin: "0 0 0.75rem" }}>A situação</h2>
            {caseData.briefing.split("\n\n").map((para, i) => <p key={i} style={{ fontSize: 15, color: "#333", lineHeight: 1.7, margin: "0 0 0.75rem" }}>{para}</p>)}
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#185FA5", margin: "1.25rem 0 0.75rem" }}>Sua missão</h2>
            {[
              { label: "Diagnóstico", text: caseData.mission.diagnostico },
              { label: "Plano de ação", text: caseData.mission.oQueMuda },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", margin: "0.5rem 0" }}>
                <span style={{ background: "#185FA5", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 15, color: "#333", lineHeight: 1.6 }}><strong>{item.label}:</strong> {item.text}</span>
              </div>
            ))}
            <div style={{ background: "#E1F5EE", borderLeft: "3px solid #0F6E56", padding: "12px 16px", borderRadius: "0 8px 8px 0", fontSize: 14, color: "#333", lineHeight: 1.6, margin: "1.5rem 0" }}>
              <strong>Como usar este espaço:</strong> A IA pode te ajudar a estruturar o raciocínio e explorar hipóteses. Use-a como parceira — as conclusões são suas.
            </div>
            <button style={{ width: "100%", padding: 14, background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer" }} onClick={() => setPhase("chat")}>
              Entendi, vamos começar →
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar — expande e ganha o campo de plano abaixo da missão */}
        <aside style={{ width: showPlanModal ? 512 : 260, background: "#042C53", display: "flex", flexDirection: "column", gap: showPlanModal ? 24 : 0, padding: showPlanModal ? "30px 28px" : "1.25rem", flexShrink: 0, overflowY: "auto", transition: "width 0.3s cubic-bezier(.645,.045,.355,1)" }}>
          <div style={{ marginBottom: showPlanModal ? 0 : "1.5rem" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#378ADD", letterSpacing: 2, marginBottom: 4 }}>HAI-Q</div>
            <div style={{ fontSize: 11, color: "#85B7EB", textTransform: "uppercase", letterSpacing: 1 }}>{caseData.id}</div>
            <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{caseData.title}</div>
          </div>

          {!showPlanModal && (
            <button style={{ width: "100%", padding: 10, marginBottom: "1.5rem", background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }} onClick={() => setShowBriefingModal(true)}>
              📄 Ver desafio completo
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: showPlanModal ? 0 : "1.5rem" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Missão</div>
            {[
              { label: "Diagnóstico", text: caseData.mission.diagnostico },
              { label: "Plano de ação", text: caseData.mission.oQueMuda },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ background: "#5b9bd8", color: "#042C53", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}><strong style={{ color: "#fff" }}>{item.label}:</strong> {item.text}</span>
              </div>
            ))}
          </div>

          {!showPlanModal && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>Progresso para liberar</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{Math.min(exchangesCount, MIN_EXCHANGES_TO_FINISH)} de {MIN_EXCHANGES_TO_FINISH}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #5b9bd8, #9254DE)", transition: "width 0.35s cubic-bezier(.645,.045,.355,1)" }} />
              </div>
              <button className="plan-cta" disabled={!canFinish} onClick={() => setShowPlanModal(true)} style={{ marginTop: 4, height: 48, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 600, transition: "background 0.2s", ...(canFinish
                ? { background: "#722ED1", border: "none", color: "#fff", boxShadow: "0 4px 14px rgba(114,46,209,0.45)", cursor: "pointer" }
                : { background: "transparent", border: "1px dashed rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.55)", cursor: "not-allowed" }) }}>
                {canFinish ? <EditOutlined style={{ fontSize: 16 }} /> : <LockOutlined style={{ fontSize: 16 }} />}
                Escrever plano de ação
              </button>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                <InfoCircleOutlined style={{ fontSize: 13, marginTop: 2, flexShrink: 0 }} />
                <span>{canFinish
                  ? "Escreva seu plano de ação clicando no botão acima. Você ainda poderá interagir com o chat enquanto registra."
                  : `Faltam ${remainingExchanges} ${remainingExchanges === 1 ? "troca" : "trocas"} com a IA para liberar o editor.`}</span>
              </div>
            </div>
          )}

          {showPlanModal && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 30, height: 30, background: "#722ED1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><EditOutlined style={{ fontSize: 15, color: "#fff" }} /></span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0 }}>Escrever plano de ação</h2>
                </div>
                <button className="editor-close" onClick={() => setShowPlanModal(false)} style={{ width: 30, height: 30, background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", transition: "all 0.2s" }}><CloseOutlined style={{ fontSize: 16 }} /></button>
              </div>
              <textarea className="plan-textarea" autoFocus style={{ flex: 1, width: "100%", minHeight: 260, resize: "vertical", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 8, padding: 14, color: "#fff", fontSize: 14, lineHeight: 1.6, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} placeholder="Escreva aqui sua hipótese de diagnóstico e seu plano de ação…" value={finalOutput} onChange={e => { setFinalOutput(e.target.value); if (e.target.value) localStorage.setItem(draftKey, e.target.value); else localStorage.removeItem(draftKey); }} />
              <button className="plan-cta" onClick={handleFinish} disabled={!finalOutput.trim() || sending} style={{ height: 48, background: "#722ED1", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(114,46,209,0.45)", cursor: finalOutput.trim() && !sending ? "pointer" : "not-allowed", opacity: finalOutput.trim() && !sending ? 1 : 0.5, transition: "background 0.2s", flexShrink: 0 }}>
                {sending ? "Enviando..." : <>Enviar e concluir <ArrowRightOutlined style={{ fontSize: 16 }} /></>}
              </button>
              {finishError && (
                <p style={{ fontSize: 12, color: "#ffb3ab", lineHeight: 1.5, margin: 0 }}>Não foi possível enviar agora. Seu texto está preservado — tente novamente.</p>
              )}
            </div>
          )}
        </aside>

        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {messages.length === 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1px solid #e0e7ef" }}>
                <p style={{ fontSize: 15, color: "#555", lineHeight: 1.6, margin: 0 }}>Olá! Estou aqui para te ajudar a explorar esse desafio. Por onde você quer começar?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ maxWidth: "80%", borderRadius: 12, padding: "12px 16px", ...(msg.role === "CANDIDATE" ? { background: "#185FA5", color: "#fff", alignSelf: "flex-end" } : { background: "#fff", color: "#222", alignSelf: "flex-start", border: msg.error ? "1px solid #e8b4b4" : "1px solid #e0e7ef" }) }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>{msg.role === "CANDIDATE" ? "Você" : "IA"}</div>
                <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", color: msg.error ? "#8a4a44" : undefined }}>{msg.content}</div>
                {msg.error && (
                  <button style={{ marginTop: 10, padding: "8px 16px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer" }} onClick={retryTurn} disabled={sending}>
                    Tentar novamente
                  </button>
                )}
              </div>
            ))}
            {sending && messages[messages.length - 1]?.role !== "AI" && (
              <div style={{ maxWidth: "80%", borderRadius: 12, padding: "12px 16px", background: "#fff", border: "1px solid #e0e7ef", alignSelf: "flex-start" }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, opacity: 0.7, textTransform: "uppercase" }}>IA</div>
                <div style={{ fontSize: 15, color: "#888" }}>Pensando...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ background: "#fff", borderTop: "1px solid #e0e7ef", padding: "1rem 1.5rem", display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <textarea style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 15, resize: "none", fontFamily: "system-ui", outline: "none" }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Digite sua mensagem... (Enter envia, Shift+Enter nova linha)" rows={3} disabled={sending} />
            <button style={{ padding: "10px 20px", background: sending || !input.trim() ? "#93b8d8" : "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: sending || !input.trim() ? "not-allowed" : "pointer", fontSize: 15, whiteSpace: "nowrap" }} onClick={sendMessage} disabled={sending || !input.trim()}>
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* Modal: ver o problema completo */}
      {showBriefingModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1.5rem" }} onClick={() => setShowBriefingModal(false)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 2rem", maxWidth: 600, width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: 11, color: "#185FA5", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{caseData.id} · {caseData.domain}</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#042C53", margin: 0 }}>{caseData.title}</h2>
              </div>
              <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", lineHeight: 1 }} onClick={() => setShowBriefingModal(false)}>✕</button>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#185FA5", margin: "0 0 0.5rem" }}>A situação</h3>
            {caseData.briefing.split("\n\n").map((para, i) => <p key={i} style={{ fontSize: 14, color: "#333", lineHeight: 1.6, margin: "0 0 0.6rem" }}>{para}</p>)}
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#185FA5", margin: "1rem 0 0.5rem" }}>Sua missão</h3>
            {[
              { label: "Diagnóstico", text: caseData.mission.diagnostico },
              { label: "Plano de ação", text: caseData.mission.oQueMuda },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "0.4rem 0" }}>
                <span style={{ background: "#185FA5", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}><strong>{item.label}:</strong> {item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .plan-cta:not(:disabled):hover { background: #9254DE !important; }
        .editor-close:hover { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
        .plan-textarea:focus { border-color: #9254DE !important; box-shadow: 0 0 0 3px rgba(146,84,222,0.25); }
        .plan-textarea::placeholder { color: rgba(255,255,255,0.4); }
      `}</style>
    </main>
  );
}
