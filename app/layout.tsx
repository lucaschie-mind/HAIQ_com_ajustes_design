import type { Metadata } from "next";
export const metadata: Metadata = { title: "HAI-Q Assessment", description: "Human-AI Intelligence Quotient" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#f0f4f8" }}>
        {children}
      </body>
    </html>
  );
}
