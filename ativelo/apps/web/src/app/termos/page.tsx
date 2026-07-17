import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <LegalShell>
      <header className="legal-page__intro">
        <span className="legal-page__meta">Documento provisório · versão 0.1</span>
        <h1>Termos de uso</h1>
        <p>Regras básicas para uma experiência segura e responsável na plataforma Ativelo.</p>
      </header>
      <article className="legal-content">
        <p className="legal-notice">Modelo demonstrativo sujeito a validação jurídica e adequação ao contrato comercial definitivo.</p>
        <h2>1. Sobre a plataforma</h2><p>A Ativelo apoia prescrição, registro e gestão de atividades físicas. Não realiza diagnóstico e não substitui avaliação médica, atendimento de emergência ou acompanhamento de profissional habilitado.</p>
        <h2>2. Conta e credenciais</h2><p>O usuário deve fornecer informações corretas, manter suas credenciais em sigilo e comunicar uso indevido. Contas são pessoais; acessos administrativos seguem autorização da organização.</p>
        <h2>3. Responsabilidades</h2><p>Profissionais respondem pela adequação técnica de prescrições e academias pela gestão dos vínculos e permissões. Alunos devem respeitar suas condições individuais e interromper a atividade diante de sinais de risco.</p>
        <h2>4. Uso aceitável</h2><ul><li>não tentar contornar permissões ou acessar outra organização;</li><li>não enviar conteúdo malicioso, ilegal ou sem autorização;</li><li>não automatizar acesso de forma abusiva;</li><li>não usar dados para discriminação ou finalidade incompatível.</li></ul>
        <h2>5. Assinatura</h2><p>Planos, limites, teste, reajuste, cancelamento e inadimplência serão detalhados na proposta comercial. Os valores exibidos nesta demonstração não constituem oferta vinculante.</p>
        <h2>6. Disponibilidade</h2><p>A plataforma adota medidas razoáveis de continuidade, observabilidade e recuperação. Janelas de manutenção, eventos externos e serviços de terceiros podem afetar a disponibilidade.</p>
        <h2>7. Propriedade intelectual</h2><p>A marca, interface, código, textos e elementos originais da Ativelo são protegidos. Dados do contratante permanecem sob sua titularidade ou responsabilidade legal.</p>
        <h2>8. Encerramento</h2><p>Acesso pode ser suspenso por risco de segurança, violação, fraude ou inadimplência, respeitando contrato e legislação. A exportação e retenção seguem a Política de Privacidade.</p>
      </article>
    </LegalShell>
  );
}
