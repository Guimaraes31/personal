import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  CloudOff,
  Dumbbell,
  Fingerprint,
  HeartHandshake,
  Layers3,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  WifiOff
} from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui/button";

const features = [
  {
    icon: Dumbbell,
    title: "Treinos que saem do papel",
    text: "Prescreva, acompanhe e ajuste. O aluno registra séries e cargas em uma experiência simples durante o treino.",
    wide: true,
    brand: true
  },
  {
    icon: TrendingUp,
    title: "Evolução que faz sentido",
    text: "Carga, frequência, medidas, metas e recordes reunidos em uma leitura clara."
  },
  {
    icon: CalendarCheck2,
    title: "Agenda sem conflito",
    text: "Aulas, vagas, reservas, cancelamentos e lista de espera no mesmo fluxo."
  },
  {
    icon: UsersRound,
    title: "Relacionamento em escala",
    text: "Encontre alunos que precisam de atenção antes que eles se afastem."
  },
  {
    icon: Layers3,
    title: "Uma rede, vários contextos",
    text: "Unidades e organizações isoladas, com visão consolidada para quem tem autorização.",
    wide: true
  }
];

const audiences = [
  ["01", "Aluno", "Treino do dia, histórico, metas e aulas sem ruído."],
  ["02", "Profissional", "Prescrição rápida e acompanhamento que gera ação."],
  ["03", "Academia", "Pessoas, agenda e indicadores operacionais em um só lugar."],
  ["04", "Rede", "Governança multiunidade e visão segura da operação."]
];

const faqs = [
  [
    "Consigo testar sem integrar nenhum sistema?",
    "Sim. A demonstração possui dados fictícios e quatro perfis para você percorrer toda a jornada. A configuração Supabase entra na ativação do ambiente real."
  ],
  [
    "A Ativelo funciona para personal trainer?",
    "Sim. O plano Personal prioriza gestão de alunos e prescrição. Academias ganham agenda, equipes, unidades, permissões e indicadores adicionais."
  ],
  [
    "Uma unidade consegue ver dados de outra?",
    "Não por padrão. O modelo multiempresa aplica isolamento no banco com Row Level Security e vínculos explícitos entre usuário, função e organização."
  ],
  [
    "Meus alunos conseguem usar pelo celular?",
    "Sim. A experiência é mobile-first e instalável como PWA. Um cliente Expo para Android e iOS compartilha o mesmo núcleo de dados e API."
  ],
  [
    "A plataforma substitui avaliação médica?",
    "Não. A Ativelo apoia o acompanhamento de treino e evolução, mas não realiza diagnóstico nem substitui orientação médica ou profissional habilitada."
  ]
];

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Ativelo",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web, Android, iOS",
    description: "Plataforma SaaS de gestão de treinos e academias.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL", description: "Teste demonstrativo" }
  };

  return (
    <>
      <SiteHeader />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="hero-badge">
                  <span className="hero-badge__dot"><Sparkles size={13} /></span>
                  Uma plataforma. Toda a academia em movimento.
                </div>
                <h1>
                  Treino conectado. <span>Evolução visível.</span>
                </h1>
                <p>
                  A Ativelo conecta alunos, profissionais e gestão para transformar cada treino em
                  progresso — e cada dado em uma próxima ação clara.
                </p>
                <div className="hero-actions">
                  <ButtonLink href="/entrar?demo=1" size="lg">
                    Explorar demonstração <ArrowRight size={18} />
                  </ButtonLink>
                  <ButtonLink href="#contato" variant="secondary" size="lg">
                    Falar com a equipe
                  </ButtonLink>
                </div>
                <div className="hero-note">
                  <span><CheckCircle2 size={15} /> Sem cartão</span>
                  <span><CheckCircle2 size={15} /> Dados demo fictícios</span>
                  <span><CheckCircle2 size={15} /> Pronto em 30 segundos</span>
                </div>
              </div>

              <div className="product-preview" aria-label="Prévia do painel do aluno">
                <div className="product-preview__screen">
                  <div className="preview-topbar">
                    <Logo href="/" />
                    <div className="preview-avatar" aria-hidden="true" />
                  </div>
                  <div className="preview-body">
                    <div className="preview-greeting">
                      <div>
                        <small>Bom dia, Mariana</small>
                        <strong>Seu ritmo está consistente.</strong>
                      </div>
                      <p>Semana 3 de 6</p>
                    </div>
                    <div className="preview-stats">
                      <div className="preview-stat"><span>Treinos</span><strong>3<em>/4</em></strong></div>
                      <div className="preview-stat"><span>Sequência</span><strong>8<em> dias</em></strong></div>
                      <div className="preview-stat"><span>Volume</span><strong>+12<em>%</em></strong></div>
                    </div>
                    <div className="preview-workout">
                      <span className="preview-workout__icon"><Dumbbell size={21} /></span>
                      <span><strong>Força A · Inferiores</strong><small>7 exercícios · cerca de 52 min</small></span>
                      <span className="preview-play"><Play size={16} fill="currentColor" /></span>
                    </div>
                    <div className="preview-progress">
                      <div className="preview-progress__top"><span>Meta semanal</span><strong>72%</strong></div>
                      <div className="progress-track"><span /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="trust-strip">
              <p>Feita para o fluxo real da sua operação</p>
              <div className="trust-items">
                <div className="trust-item"><Fingerprint size={20} /> Privacidade desde o início</div>
                <div className="trust-item"><CloudOff size={20} /> Sessão recuperável</div>
                <div className="trust-item"><UserRoundCheck size={20} /> Permissões por papel</div>
                <div className="trust-item"><Building2 size={20} /> Multiempresa nativo</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section--tight">
          <div className="container">
            <div className="metric-band" aria-label="Diferenciais da plataforma">
              <div className="metric-band__item"><strong>1 fluxo</strong><span>da prescrição ao histórico</span></div>
              <div className="metric-band__item"><strong>4 perfis</strong><span>com contexto e permissões próprias</span></div>
              <div className="metric-band__item"><strong>100%</strong><span>responsiva e instalável</span></div>
              <div className="metric-band__item"><strong>LGPD</strong><span>como decisão de arquitetura</span></div>
            </div>
          </div>
        </section>

        <section className="section section--surface" id="produto">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Produto</span>
              <h2>Menos troca de tela. Mais tempo com pessoas.</h2>
              <p>
                Cada módulo nasce conectado ao próximo. O que o professor prescreve vira a
                experiência do aluno e atualiza a leitura de gestão.
              </p>
            </div>
            <div className="feature-grid">
              {features.map(({ icon: Icon, title, text, wide, brand }) => (
                <article className={`feature-card${wide ? " feature-card--wide" : ""}${brand ? " feature-card--brand" : ""}`} key={title}>
                  <span className="feature-card__icon"><Icon size={23} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  {title.startsWith("Evolução") && <div className="feature-card__visual" aria-hidden="true"><span /><span /><span /><span /><span /></div>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="para-quem">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Um elo para cada perfil</span>
              <h2>A mesma informação, na medida certa para cada pessoa.</h2>
              <p>Sem painéis genéricos. Cada papel começa pelo que precisa decidir agora.</p>
            </div>
            <div className="audience-tabs">
              {audiences.map(([number, title, text]) => (
                <article className="audience-card" key={title}>
                  <span className="audience-card__number">{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--surface">
          <div className="container workflow">
            <div className="workflow-visual" aria-hidden="true">
              <div className="workflow-card workflow-card--one">
                <div className="workflow-card__head"><span><Target size={20} /></span><div><strong>Treino prescrito</strong><small>por Lucas Mendes · 09:42</small></div></div>
                <div className="workflow-lines"><span /><span /><span /></div>
              </div>
              <div className="workflow-card workflow-card--two">
                <div className="workflow-card__head"><span><TrendingUp size={20} /></span><div><strong>Novo recorde</strong><small>Agachamento · 72 kg</small></div></div>
                <div className="workflow-lines"><span /><span /><span /></div>
              </div>
            </div>
            <div>
              <span className="eyebrow">Do plano ao progresso</span>
              <h2>Uma jornada que fecha o ciclo.</h2>
              <p className="text-muted">O dado só tem valor quando volta para a próxima decisão.</p>
              <div className="step-list">
                <div className="step"><span className="step__number">01</span><div><h3>Professor prescreve</h3><p>Cria ou reutiliza um modelo e personaliza as orientações.</p></div></div>
                <div className="step"><span className="step__number">02</span><div><h3>Aluno executa</h3><p>Registra séries com autosave, descanso e referência da carga anterior.</p></div></div>
                <div className="step"><span className="step__number">03</span><div><h3>Todos evoluem</h3><p>Histórico, alertas e indicadores são atualizados a partir da sessão real.</p></div></div>
              </div>
              <ButtonLink href="/entrar?demo=professional" variant="secondary" size="lg" className="mt-8">
                Ver o fluxo completo <ChevronRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="section" id="seguranca">
          <div className="container">
            <div className="security-panel">
              <div className="security-copy">
                <span className="eyebrow">Segurança e LGPD</span>
                <h2>Dados sensíveis merecem decisões sérias.</h2>
                <p>
                  Isolamento entre organizações, acesso mínimo necessário e rastreabilidade são
                  parte do modelo — não um complemento de última hora.
                </p>
                <div className="security-points">
                  <span className="security-point"><Check size={17} /> Row Level Security</span>
                  <span className="security-point"><Check size={17} /> Consentimento explícito</span>
                  <span className="security-point"><Check size={17} /> Auditoria sem saúde</span>
                  <span className="security-point"><Check size={17} /> Arquivos privados</span>
                  <span className="security-point"><Check size={17} /> Exclusão e portabilidade</span>
                  <span className="security-point"><Check size={17} /> Segredos fora do código</span>
                </div>
              </div>
              <div className="security-art" aria-hidden="true">
                <div className="security-art__ring"><span className="security-art__shield"><ShieldCheck size={54} /></span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--surface" id="planos">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Planos</span>
              <h2>Comece no seu tamanho. Cresça sem trocar de plataforma.</h2>
              <p>Valores de lançamento demonstrativos. Cobrança real permanece desativada neste MVP.</p>
            </div>
            <div className="pricing-grid">
              <article className="price-card">
                <h3>Personal</h3><p>Para profissionais que querem acompanhar cada aluno de perto.</p>
                <div className="price"><strong>R$ 49</strong><span>/mês</span></div>
                <ul className="check-list"><li><Check size={17} /> Até 20 alunos</li><li><Check size={17} /> Prescrição e histórico</li><li><Check size={17} /> Evolução e metas</li></ul>
                <ButtonLink href="/entrar?demo=professional" variant="secondary">Testar como personal</ButtonLink>
              </article>
              <article className="price-card price-card--featured">
                <span className="price-card__tag">Mais escolhido</span>
                <h3>Academia Pro</h3><p>Operação, equipe, aulas e experiência completa do aluno.</p>
                <div className="price"><strong>R$ 399</strong><span>/mês</span></div>
                <ul className="check-list"><li><Check size={17} /> Até 500 alunos</li><li><Check size={17} /> Profissionais e permissões</li><li><Check size={17} /> Agenda e reservas</li><li><Check size={17} /> Indicadores operacionais</li></ul>
                <ButtonLink href="/entrar?demo=organization_admin">Explorar academia</ButtonLink>
              </article>
              <article className="price-card">
                <h3>Rede</h3><p>Governança, unidades e recursos ajustados à sua operação.</p>
                <div className="price"><strong>Sob medida</strong></div>
                <ul className="check-list"><li><Check size={17} /> Múltiplas organizações</li><li><Check size={17} /> Limites personalizados</li><li><Check size={17} /> Implantação assistida</li></ul>
                <ButtonLink href="#contato" variant="secondary">Conversar com a equipe</ButtonLink>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Cenários demonstrativos</span>
              <h2>Uma experiência pensada de ponta a ponta.</h2>
              <p>Os relatos abaixo são exemplos fictícios de uso, não depoimentos de clientes reais.</p>
            </div>
            <div className="testimonial-grid">
              <article className="testimonial"><span className="testimonial__label">Relato fictício</span><blockquote>“Hoje eu identifico quem perdeu ritmo e ajusto o treino antes da próxima aula.”</blockquote><footer><span className="testimonial__avatar">LM</span><span><strong>Lucas Mendes</strong><span>Personal trainer fictício</span></span></footer></article>
              <article className="testimonial"><span className="testimonial__label">Relato fictício</span><blockquote>“Durante o treino eu vejo só o que importa. E minha carga anterior já está ali.”</blockquote><footer><span className="testimonial__avatar">MC</span><span><strong>Mariana Costa</strong><span>Aluna fictícia</span></span></footer></article>
              <article className="testimonial"><span className="testimonial__label">Relato fictício</span><blockquote>“A agenda e os indicadores finalmente contam a mesma história para a equipe.”</blockquote><footer><span className="testimonial__avatar">RA</span><span><strong>Renata Alves</strong><span>Gestora fictícia</span></span></footer></article>
            </div>
          </div>
        </section>

        <section className="section section--surface">
          <div className="container faq-layout">
            <div><span className="eyebrow">Dúvidas frequentes</span><h2>Antes de você começar.</h2><p className="text-muted">Não encontrou sua resposta? Fale com a equipe pelo formulário.</p></div>
            <div className="faq-list">
              {faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}</summary><p>{answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="section" id="contato">
          <div className="container contact-panel">
            <div className="contact-copy"><span className="eyebrow">Próximo passo</span><h2>Vamos colocar sua operação em movimento?</h2><p>Conte seu contexto. O formulário desta demo salva a solicitação somente no seu navegador e deixa claro como será a integração comercial.</p></div>
            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
