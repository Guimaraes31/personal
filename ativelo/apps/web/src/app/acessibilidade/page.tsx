import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = { title: "Acessibilidade" };

export default function AccessibilityPage() {
  return (
    <LegalShell>
      <header className="legal-page__intro"><span className="legal-page__meta">Compromisso contínuo</span><h1>Acessibilidade</h1><p>A Ativelo busca uma experiência utilizável por pessoas com diferentes capacidades, tecnologias e contextos.</p></header>
      <article className="legal-content">
        <h2>O que já orienta o produto</h2>
        <ul><li>HTML semântico, regiões e títulos hierárquicos;</li><li>navegação por teclado e foco visível;</li><li>contraste compatível com WCAG AA;</li><li>alvos de toque de pelo menos 44–48 px;</li><li>labels, mensagens de erro e estados anunciáveis;</li><li>suporte a redução de movimento e tema escuro;</li><li>resumo textual para gráficos e indicadores.</li></ul>
        <h2>Limitações conhecidas</h2><p>O MVP ainda passará por auditoria assistiva com leitores de tela e pessoas usuárias. Gráficos e execução de treino recebem testes adicionais antes do lançamento.</p>
        <h2>Como colaborar</h2><p>Ao encontrar uma barreira, registre o caminho percorrido, dispositivo e tecnologia assistiva. O canal dedicado será publicado na versão comercial.</p>
      </article>
    </LegalShell>
  );
}
