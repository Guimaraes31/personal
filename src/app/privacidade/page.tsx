import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <LegalShell>
      <header className="legal-page__intro">
        <span className="legal-page__meta">Documento provisório · versão 0.1</span>
        <h1>Política de privacidade</h1>
        <p>Como a Ativelo foi desenhada para tratar dados pessoais com transparência e respeito à LGPD.</p>
      </header>
      <article className="legal-content">
        <p className="legal-notice">Este texto é um modelo técnico demonstrativo e deve ser revisado por assessoria jurídica antes da operação comercial.</p>
        <h2>1. Quem controla os dados</h2>
        <p>A academia ou o profissional contratante normalmente atua como controlador dos dados de seus alunos. A Ativelo atua como operadora conforme as instruções contratuais, e como controladora apenas dos dados necessários à relação comercial e à segurança da plataforma.</p>
        <h2>2. Dados que podem ser tratados</h2>
        <ul><li>identificação, contato, credenciais e preferências;</li><li>vínculo com academia, unidade, professor e plano;</li><li>treinos, séries, cargas, presença e feedback;</li><li>medidas, limitações e outros dados sensíveis fornecidos voluntariamente;</li><li>registros técnicos mínimos para segurança e auditoria.</li></ul>
        <h2>3. Finalidades e bases legais</h2>
        <p>Os dados são usados para fornecer o serviço contratado, manter segurança, cumprir obrigações legais e, quando necessário, mediante consentimento explícito — especialmente para informações sensíveis sem outra base aplicável.</p>
        <h2>4. Minimização e acesso</h2>
        <p>Cada perfil acessa somente o necessário. Administradores operacionais não recebem acesso automático a informações de saúde; profissionais dependem de vínculo e finalidade válida.</p>
        <h2>5. Compartilhamento e transferências</h2>
        <p>Fornecedores de infraestrutura, e-mail, monitoramento e pagamentos podem processar dados sob contrato, controles de segurança e avaliação de transferência internacional quando aplicável. A Ativelo não vende dados pessoais.</p>
        <h2>6. Retenção e eliminação</h2>
        <p>Dados são mantidos pelo período da relação, por prazos legais ou conforme política configurada pelo controlador. Pedidos de exclusão consideram obrigações de retenção, prevenção a fraude e cópias de segurança com expiração controlada.</p>
        <h2>7. Direitos do titular</h2>
        <p>O titular pode solicitar confirmação, acesso, correção, portabilidade, informação sobre compartilhamento, revisão de decisões automatizadas, oposição e eliminação quando cabível.</p>
        <h2>8. Segurança</h2>
        <p>A arquitetura prevê criptografia em trânsito, Row Level Security, autenticação, princípio do menor privilégio, trilhas de auditoria sem conteúdo sensível, arquivos privados e resposta a incidentes.</p>
        <h2>9. Contato</h2>
        <p>Antes do lançamento comercial, este documento receberá os dados completos do controlador, canal do encarregado e procedimentos com prazo de resposta.</p>
      </article>
    </LegalShell>
  );
}
