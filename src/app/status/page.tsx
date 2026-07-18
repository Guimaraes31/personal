import type { Metadata } from "next";
import { Check, CheckCircle2 } from "lucide-react";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = { title: "Status do sistema" };

export default function StatusPage() {
  return (
    <LegalShell>
      <header className="legal-page__intro"><span className="legal-page__meta">Ambiente demonstrativo</span><h1>Status do sistema</h1><p>Estado previsto dos componentes deste MVP. Monitoramento externo é ativado na implantação.</p></header>
      <div className="status-card">
        <div className="status-card__summary"><span><CheckCircle2 size={22} /></span><div><strong>Todos os componentes da demonstração estão disponíveis</strong><small>Verificação local · sem SLA comercial</small></div></div>
        <div className="status-list">
          {[["Aplicação web e PWA", "Operacional"], ["Persistência local demo", "Operacional"], ["API Supabase", "Aguardando configuração"], ["E-mails e push", "Preparado, não conectado"], ["Pagamentos", "Provedor simulado"]].map(([name, state]) => <div className="status-row" key={name}><strong>{name}</strong><span><Check size={14} /> {state}</span></div>)}
        </div>
      </div>
    </LegalShell>
  );
}
