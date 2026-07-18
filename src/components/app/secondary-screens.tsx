"use client";

import {
  Building2,
  CheckCircle2,
  Info,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { useDemoStore } from "@/lib/demo-store";

function Denied({ text = "Seu perfil não possui permissão para abrir esta área." }: { text?: string }) {
  return (
    <div className="access-denied">
      <div>
        <span className="access-denied__icon">
          <Info size={30} />
        </span>
        <h1>Acesso restrito</h1>
        <p>{text}</p>
        <ButtonLink href="/app/inicio">Voltar ao início</ButtonLink>
      </div>
    </div>
  );
}

export function OrganizationScreen() {
  const { data, session, updateOrganization } = useDemoStore();
  const organization = data.organizations[0];
  const subscription = data.subscriptions.find(
    (item) => item.organizationId === organization?.id,
  );
  const [name, setName] = useState(organization?.name ?? "");
  const [saved, setSaved] = useState(false);

  if (session?.role !== "organization_admin" || !organization) return <Denied />;

  function save() {
    const result = updateOrganization({ organizationId: organization!.id, name: name.trim() });
    setSaved(result.ok);
  }

  return (
    <>
      <PageHeader
        eyebrow="Organização"
        title="Dados da academia"
        description="Atualize informações públicas e acompanhe o plano contratado."
      />
      <div className="dashboard-grid">
        <section className="panel">
          <header className="panel__header">
            <div>
              <h2>Identidade</h2>
              <p>Nome exibido para alunos e equipe.</p>
            </div>
          </header>
          <div className="panel__body">
            <div className="builder-fields">
              <Field label="Nome da academia" value={name} onChange={(e) => setName(e.target.value)} />
              <Field label="Slug" value={organization.slug} readOnly />
              <Field label="Status" value={organization.status} readOnly />
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <Button onClick={save}>
                <CheckCircle2 size={16} /> Salvar alterações
              </Button>
              {saved && <span className="badge badge--success">Salvo</span>}
            </div>
          </div>
        </section>
        <aside className="dashboard-stack">
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Plano</h2>
                <p>Limites da demonstração</p>
              </div>
            </header>
            <div className="panel__body">
              <div className="list">
                <div className="list-row">
                  <span className="list-row__icon">
                    <ReceiptText size={18} />
                  </span>
                  <span className="list-row__main">
                    <strong>{subscription?.planCode ?? "—"}</strong>
                    <small>
                      {subscription?.studentLimit ?? 0} alunos · {subscription?.professionalLimit ?? 0}{" "}
                      profissionais
                    </small>
                  </span>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

export function ReportsScreen() {
  const { session, metrics } = useDemoStore();
  if (session?.role !== "organization_admin") return <Denied />;
  const org = metrics.organization;

  return (
    <>
      <PageHeader
        eyebrow="Relatórios"
        title="Indicadores operacionais"
        description="Leitura agregada da academia sem dados clínicos individuais."
      />
      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Alunos</span>
          </div>
          <div className="stat-card__value">
            <strong>{org?.students ?? 0}</strong>
            <span>cadastrados</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Ativos</span>
          </div>
          <div className="stat-card__value">
            <strong>{org?.activeStudents ?? 0}</strong>
            <span>no período</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Treinos</span>
          </div>
          <div className="stat-card__value">
            <strong>{org?.completedWorkoutsLast30Days ?? 0}</strong>
            <span>30 dias</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Ocupação</span>
          </div>
          <div className="stat-card__value">
            <strong>{org?.classOccupancyRate ?? 0}</strong>
            <span>%</span>
          </div>
        </article>
      </div>
      <section className="panel">
        <header className="panel__header">
          <div>
            <h2>Resumo</h2>
            <p>Os valores vêm das métricas da demonstração.</p>
          </div>
        </header>
        <div className="panel__body">
          <div className="list">
            <div className="list-row">
              <span className="list-row__main">
                <strong>{org?.confirmedBookings ?? 0} reservas confirmadas</strong>
                <small>{org?.waitlistedBookings ?? 0} em lista de espera</small>
              </span>
            </div>
            <div className="list-row">
              <span className="list-row__main">
                <strong>{org?.professionals ?? 0} profissionais</strong>
                <small>{org?.inactiveStudents ?? 0} alunos sem atividade recente</small>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function PlatformScreen({ organizationId }: { organizationId?: string }) {
  const { data, session, updateOrganization, updateSubscription } = useDemoStore();
  if (session?.role !== "saas_admin") return <Denied />;

  if (organizationId) {
    const organization = data.organizations.find((item) => item.id === organizationId);
    const subscription = data.subscriptions.find((item) => item.organizationId === organizationId);
    if (!organization) return <Denied text="Organização não encontrada." />;

    return (
      <>
        <PageHeader
          eyebrow="Cliente"
          title={organization.name}
          description="Metadados e assinatura da organização no modo demonstração."
          actions={
            <ButtonLink href="/app/plataforma" variant="secondary">
              Voltar
            </ButtonLink>
          }
        />
        <div className="dashboard-grid">
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Status</h2>
                <p>Alterações persistem só nesta demo.</p>
              </div>
            </header>
            <div className="panel__body">
              <div className="filter-actions">
                {(["active", "trial", "suspended"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={organization.status === status ? "primary" : "secondary"}
                    onClick={() =>
                      updateOrganization({ organizationId: organization.id, status })
                    }
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </section>
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Plano</h2>
                <p>{subscription?.planCode ?? "sem plano"}</p>
              </div>
            </header>
            <div className="panel__body">
              <SelectField
                label="Código do plano"
                value={subscription?.planCode ?? "essential"}
                onChange={(event) =>
                  updateSubscription({
                    organizationId: organization.id,
                    planCode: event.target.value as
                      | "personal"
                      | "essential"
                      | "professional"
                      | "network"
                  })
                }
              >
                <option value="personal">personal</option>
                <option value="essential">essential</option>
                <option value="professional">professional</option>
                <option value="network">network</option>
              </SelectField>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Plataforma"
        title="Academias clientes"
        description="Visão multiempresa com isolamento de dados sensíveis."
      />
      <div className="list">
        {data.organizations.map((organization) => {
          const sub = data.subscriptions.find((item) => item.organizationId === organization.id);
          return (
            <Link
              className="list-row"
              href={`/app/plataforma/${organization.id}`}
              key={organization.id}
            >
              <span className="list-row__icon">
                <Building2 size={18} />
              </span>
              <span className="list-row__main">
                <strong>{organization.name}</strong>
                <small>
                  Plano {sub?.planCode ?? "—"} · {sub?.studentLimit ?? 0} alunos
                </small>
              </span>
              <span
                className={`badge ${
                  organization.status === "active"
                    ? "badge--success"
                    : organization.status === "trial"
                      ? "badge--warning"
                      : "badge--danger"
                }`}
              >
                {organization.status}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function PlansScreen() {
  const { data, session } = useDemoStore();

  const plans = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sub of data.subscriptions) {
      counts[sub.planCode] = (counts[sub.planCode] ?? 0) + 1;
    }
    return [
      { code: "personal", price: 49, count: counts.personal ?? 0 },
      { code: "essential", price: 199, count: counts.essential ?? 0 },
      { code: "professional", price: 399, count: counts.professional ?? 0 },
      { code: "network", price: 899, count: counts.network ?? 0 }
    ];
  }, [data.subscriptions]);

  if (session?.role !== "saas_admin") return <Denied />;

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Planos e limites"
        description="Catálogo demonstrativo sem cobrança real."
      />
      <div className="cards-grid">
        {plans.map((plan) => (
          <article className="workout-card" key={plan.code}>
            <div className="workout-card__top">
              <span className="workout-card__icon">
                <ReceiptText size={21} />
              </span>
              <span className="badge badge--brand">{plan.count} orgs</span>
            </div>
            <h3>{plan.code}</h3>
            <p>R$ {plan.price}/mês · valores ilustrativos da demo.</p>
          </article>
        ))}
      </div>
    </>
  );
}

export function AuditScreen() {
  const { session } = useDemoStore();
  if (session?.role !== "saas_admin") return <Denied />;

  const events = [
    ["Login demo · gestora", "Há 12 min"],
    ["Assinatura trial renovada", "Há 2 h"],
    ["Organização criada", "Ontem"],
    ["Política RLS revisada", "Há 3 dias"]
  ];

  return (
    <>
      <PageHeader
        eyebrow="Governança"
        title="Auditoria"
        description="Trilha demonstrativa de eventos administrativos."
      />
      <section className="panel">
        <div className="panel__body">
          <div className="list">
            {events.map(([title, when]) => (
              <div className="list-row" key={title}>
                <span className="list-row__icon">
                  <ShieldCheck size={18} />
                </span>
                <span className="list-row__main">
                  <strong>{title}</strong>
                  <small>{when}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function SupportScreen() {
  const { session } = useDemoStore();
  if (session?.role !== "saas_admin" && session?.role !== "professional") return <Denied />;

  const tickets =
    session.role === "saas_admin"
      ? [
          ["Studio Impulso pergunta sobre trial", "Aberto"],
          ["Exportação de alunos", "Em análise"],
          ["Dúvida de faturamento", "Resolvido"]
        ]
      : [
          ["Lia enviou feedback do treino", "Nova"],
          ["Beatriz pediu ajuste de carga", "Em andamento"]
        ];

  return (
    <>
      <PageHeader
        eyebrow={session.role === "saas_admin" ? "Suporte" : "Mensagens"}
        title={session.role === "saas_admin" ? "Fila de suporte" : "Mensagens e feedbacks"}
        description="Conteúdo demonstrativo para explorar o perfil."
      />
      <section className="panel">
        <div className="panel__body">
          <div className="list">
            {tickets.map(([title, status]) => (
              <div className="list-row" key={title}>
                <span className="list-row__icon">
                  <MessageSquareText size={18} />
                </span>
                <span className="list-row__main">
                  <strong>{title}</strong>
                  <small>Demo · sem envio real</small>
                </span>
                <span className="badge badge--brand">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function ProfileScreen() {
  const { session } = useDemoStore();
  if (!session) return null;

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Meu perfil"
        description="Dados da sessão de demonstração neste navegador."
      />
      <section className="panel">
        <div className="panel__body">
          <div className="list">
            <div className="list-row">
              <span className="list-row__icon">
                <UserRound size={18} />
              </span>
              <span className="list-row__main">
                <strong>{session.name}</strong>
                <small>{session.email}</small>
              </span>
            </div>
            <div className="list-row">
              <span className="list-row__main">
                <strong>Papel</strong>
                <small>{session.role}</small>
              </span>
            </div>
            <div className="list-row">
              <span className="list-row__main">
                <strong>Organização</strong>
                <small>{session.organizationName ?? "Operação da plataforma"}</small>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function PrivacyScreen() {
  const { session } = useDemoStore();
  if (!session) return null;

  return (
    <>
      <PageHeader
        eyebrow="Privacidade"
        title="Privacidade e dados"
        description="Nesta demo, os dados ficam apenas no armazenamento local do navegador."
      />
      <section className="panel">
        <div className="panel__body">
          <div className="list">
            <div className="list-row">
              <span className="list-row__main">
                <strong>Sessão local</strong>
                <small>ativelo:session no localStorage</small>
              </span>
            </div>
            <div className="list-row">
              <span className="list-row__main">
                <strong>Dados da demo</strong>
                <small>ativelo:demo-store — você pode limpar no navegador a qualquer momento</small>
              </span>
            </div>
            <div className="list-row">
              <span className="list-row__main">
                <strong>Sem envio externo</strong>
                <small>Mutações da demo não saem deste dispositivo</small>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
