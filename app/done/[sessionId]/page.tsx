export default function DonePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "system-ui" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", maxWidth: 480, width: "100%", padding: "3rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>✅</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#042C53", margin: "0 0 1rem" }}>Assessment concluído!</h1>
        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.6, margin: 0 }}>Obrigado pela participação. Sua interação foi registrada e será avaliada. Os resultados ficarão disponíveis para o time responsável pelo processo.</p>
      </div>
    </main>
  );
}
