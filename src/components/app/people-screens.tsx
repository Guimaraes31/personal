"use client";

import { calculateSessionVolume } from "@ativelo/core";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  Info,
  Search,
  TrendingUp,
  UserCheck,
  UserMinus,
  UsersRound
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { ButtonLink } from "@/components/ui/button";
import { useDemoStore } from "@/lib/demo-store";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function StudentsScreen() {
  const { data, session, getStudentMetrics } = useDemoStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "attention">("all");

  if (session?.role !== "professional") return <Denied />;

  const students = data.memberships
    .filter((item) => item.role === "student")
    .map((membership) => {
      const user = data.users.find((item) => item.id === membership.userId);
      const metrics = getStudentMetrics(membership.userId);
      return user ? { user, membership, metrics } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.user.name.toLowerCase().includes(query.toLowerCase()))
    .filter((item) => {
      if (status === "all") return true;
      if (status === "active") return (item.metrics?.completedWorkouts ?? 0) > 0;
      return (item.metrics?.weeklyFrequency ?? 0) === 0;
    });

  return (
    <>
      <PageHeader
        eyebrow="Acompanhamento"
        title="Seus alunos"
        description="Priorize contatos com base em atividade e contexto, sem mensagens culpabilizadoras."
      />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Buscar aluno</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
          />
        </label>
        <div className="segmented">
          <button type="button" aria-pressed={status === "all"} onClick={() => setStatus("all")}>
            Todos
          </button>
          <button type="button" aria-pressed={status === "active"} onClick={() => setStatus("active")}>
            Ativos
          </button>
          <button
            type="button"
            aria-pressed={status === "attention"}
            onClick={() => setStatus("attention")}
          >
            Atenção
          </button>
        </div>
      </div>
      {students.length === 0 ? (
        <div className="empty-state">
          <div>
            <span className="empty-state__icon">
              <UsersRound size={23} />
            </span>
            <h3>Nenhum aluno neste filtro</h3>
            <p>Limpe a busca ou escolha outra situação.</p>
          </div>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Situação</th>
                <th>Treinos</th>
                <th>Frequência</th>
                <th>Peso mais recente</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map(({ user, metrics }) => {
                const active = (metrics?.weeklyFrequency ?? 0) > 0;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="data-table__person">
                        <span className="avatar">{initials(user.name)}</span>
                        <span>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${active ? "badge--success" : "badge--warning"}`}>
                        {active ? "No ritmo" : "Reaproximar"}
                      </span>
                    </td>
                    <td>{metrics?.completedWorkouts ?? 0}</td>
                    <td>{metrics?.weeklyFrequency ?? 0} nesta semana</td>
                    <td>
                      {metrics?.latestWeightKg
                        ? `${metrics.latestWeightKg.toLocaleString("pt-BR")} kg`
                        : "Não informado"}
                    </td>
                    <td>
                      <div className="table-actions">
                        <ButtonLink href={`/app/alunos/${user.id}`} variant="secondary" size="sm">
                          Acompanhar
                        </ButtonLink>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function StudentDetailScreen({ studentId }: { studentId: string }) {
  const { data, session, getStudentMetrics } = useDemoStore();

  if (session?.role !== "professional") return <Denied />;

  const student = data.users.find((item) => item.id === studentId);
  const membership = data.memberships.find(
    (item) => item.userId === studentId && item.role === "student",
  );
  if (!student || !membership) {
    return (
      <Denied
        title="Aluno não encontrado"
        text="O registro não existe ou pertence a outra organização."
      />
    );
  }

  const metrics = getStudentMetrics(studentId);
  const sessions = data.workoutSessions
    .filter((item) => item.studentId === studentId && item.status === "completed")
    .sort(
      (a, b) =>
        Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt),
    );
  const measurements = data.bodyMeasurements
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt));
  const plans = data.workoutPlans.filter((item) => item.studentId === studentId);

  return (
    <>
      <PageHeader
        eyebrow="Acompanhamento individual"
        title={student.name}
        description="Treinos, aderência e evolução dentro do vínculo profissional autorizado."
        actions={
          <>
            <ButtonLink href="/app/alunos" variant="secondary">
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </ButtonLink>
            <ButtonLink href={`/app/treinos/novo?student=${student.id}`}>
              <Dumbbell size={16} />
              <span>Prescrever treino</span>
            </ButtonLink>
          </>
        }
      />
      <div className="health-notice">
        <Info size={18} />
        <span>
          <strong>Acesso sensível e contextual.</strong> Use estas informações apenas para
          acompanhamento profissional. O administrador operacional não enxerga este conteúdo.
        </span>
      </div>
      <div className="stats-grid">
        <StudentStat
          label="Treinos concluídos"
          value={metrics?.completedWorkouts ?? 0}
          suffix="sessões"
          icon={Dumbbell}
        />
        <StudentStat
          label="Frequência semanal"
          value={metrics?.weeklyFrequency ?? 0}
          suffix="treinos"
          icon={CalendarDays}
        />
        <StudentStat
          label="Volume acumulado"
          value={(metrics?.totalVolume ?? 0).toLocaleString("pt-BR")}
          suffix="kg"
          icon={Activity}
        />
        <StudentStat
          label="Peso recente"
          value={metrics?.latestWeightKg?.toLocaleString("pt-BR") ?? "—"}
          suffix="kg"
          icon={TrendingUp}
        />
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-stack">
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Planos prescritos</h2>
                <p>Versões ativas para este aluno.</p>
              </div>
            </header>
            <div className="panel__body">
              <div className="list">
                {plans.map((plan) => (
                  <div className="list-row" key={plan.id}>
                    <span className="list-row__icon">
                      <Dumbbell size={18} />
                    </span>
                    <span className="list-row__main">
                      <strong>{plan.name}</strong>
                      <small>
                        {plan.exercises.length} exercícios · {plan.scheduledWeekdays.length}x/semana ·
                        versão {plan.version}
                      </small>
                    </span>
                    <span className={`badge ${plan.active ? "badge--success" : ""}`}>
                      {plan.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Sessões recentes</h2>
                <p>Feedback e carga total registrada.</p>
              </div>
            </header>
            <div className="panel__body">
              <div className="list">
                {sessions.map((item) => {
                  const plan = plans.find((candidate) => candidate.id === item.workoutPlanId);
                  return (
                    <div className="list-row" key={item.id}>
                      <span className="list-row__icon">
                        <Activity size={18} />
                      </span>
                      <span className="list-row__main">
                        <strong>{plan?.name ?? "Treino"}</strong>
                        <small>
                          {item.feedback || "Sem feedback"} ·{" "}
                          {calculateSessionVolume(item).toLocaleString("pt-BR")} kg
                        </small>
                      </span>
                      <span className="badge badge--brand">RPE {item.perceivedEffort ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
        <aside className="dashboard-stack">
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Últimas medidas</h2>
                <p>Dados fornecidos pelo aluno</p>
              </div>
            </header>
            <div className="panel__body">
              <div className="list">
                {measurements.length ? (
                  measurements.slice(0, 3).map((item) => (
                    <div className="list-row" key={item.id}>
                      <span className="list-row__icon">
                        <TrendingUp size={18} />
                      </span>
                      <span className="list-row__main">
                        <strong>{item.weightKg.toLocaleString("pt-BR")} kg</strong>
                        <small>
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          }).format(new Date(item.measuredAt))}
                        </small>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <p>O aluno ainda não registrou medidas.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Sinal para contato</h2>
                <p>Leitura não punitiva</p>
              </div>
            </header>
            <div className="panel__body">
              <div className="list-row">
                <span className="list-row__icon">
                  {(metrics?.weeklyFrequency ?? 0) > 0 ? (
                    <UserCheck size={18} />
                  ) : (
                    <UserMinus size={18} />
                  )}
                </span>
                <span className="list-row__main">
                  <strong>
                    {(metrics?.weeklyFrequency ?? 0) > 0
                      ? "Mantendo o ritmo"
                      : "Sem atividade nesta semana"}
                  </strong>
                  <small>
                    {(metrics?.weeklyFrequency ?? 0) > 0
                      ? "Reconheça a consistência e valide o plano."
                      : "Pergunte como apoiar, sem cobrança."}
                  </small>
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function StudentStat({
  label,
  value,
  suffix,
  icon: Icon
}: {
  label: string;
  value: number | string;
  suffix: string;
  icon: typeof Activity;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon">
          <Icon size={18} />
        </span>
      </div>
      <div className="stat-card__value">
        <strong>{value}</strong>
        <span>{suffix}</span>
      </div>
      <div className="stat-card__trend stat-card__trend--neutral">Dados do aluno</div>
    </article>
  );
}

export function PeopleScreen() {
  const { data, session } = useDemoStore();
  const [query, setQuery] = useState("");

  const people = useMemo(
    () =>
      data.memberships
        .map((membership) => {
          const user = data.users.find((item) => item.id === membership.userId);
          return user ? { user, membership } : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .filter(
          (item) =>
            item.user.name.toLowerCase().includes(query.toLowerCase()) ||
            item.user.email.toLowerCase().includes(query.toLowerCase()),
        ),
    [data.memberships, data.users, query],
  );

  if (session?.role !== "organization_admin") return <Denied />;

  const roleName = {
    student: "Aluno",
    professional: "Profissional",
    organization_admin: "Gestão"
  } as const;

  return (
    <>
      <PageHeader
        eyebrow="Cadastros operacionais"
        title="Pessoas da organização"
        description="A gestão visualiza vínculos e atividade operacional, sem acessar medidas ou detalhes de saúde."
      />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Buscar pessoa</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
          />
        </label>
        <span className="badge badge--brand">{people.length} pessoas</span>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Papel</th>
              <th>Vínculo</th>
              <th>Última atividade</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {people.map(({ user, membership }, index) => (
              <tr key={membership.id}>
                <td>
                  <div className="data-table__person">
                    <span className="avatar">{initials(user.name)}</span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                </td>
                <td>{roleName[membership.role]}</td>
                <td>Unidade Centro</td>
                <td>{index % 2 === 0 ? "Hoje, 10:42" : "Há 7 dias"}</td>
                <td>
                  <span className={`badge ${membership.active ? "badge--success" : "badge--danger"}`}>
                    {membership.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Denied({
  title = "Acesso restrito",
  text = "Seu perfil não possui permissão para abrir esta área."
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="access-denied">
      <div>
        <span className="access-denied__icon">
          <Info size={30} />
        </span>
        <h1>{title}</h1>
        <p>{text}</p>
        <ButtonLink href="/app/inicio">Voltar ao início</ButtonLink>
      </div>
    </div>
  );
}
