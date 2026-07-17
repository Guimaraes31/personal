"use client";

import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Dumbbell,
  Flame,
  Gauge,
  Plus,
  ReceiptText,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  UserMinus,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useDemoStore } from "@/lib/demo-store";

function firstName(name?: string) { return name?.split(" ")[0] ?? "você"; }
function initials(name: string) { return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function number(value: number) { return new Intl.NumberFormat("pt-BR").format(value); }
function time(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }

function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [welcome, setWelcome] = useState(searchParams.get("welcome") === "1");
  const { data, session, metrics, startWorkoutSession } = useDemoStore();
  const student = metrics.student;
  const plan = data.workoutPlans.find((item) => item.active);
  const currentSession = data.workoutSessions.find((item) => item.status === "in_progress");
  const completed = data.workoutSessions.filter((item) => item.status === "completed").sort((a, b) => Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt));
  const nextClass = data.classSessions.filter((item) => item.status === "scheduled").sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  const workoutProgress = currentSession ? Math.round((currentSession.sets.filter((set) => set.status !== "pending").length / Math.max(1, currentSession.sets.length)) * 100) : 0;

  function start() {
    if (currentSession) { router.push(`/app/sessoes/${currentSession.id}`); return; }
    if (!plan) return;
    const result = startWorkoutSession({ workoutPlanId: plan.id });
    if (result.ok) router.push(`/app/sessoes/${result.value.id}`);
  }

  return (
    <>
      {welcome && <div className="welcome-banner" role="status"><Sparkles size={19} /><span><strong>Conta criada.</strong> Seu espaço demonstrativo está pronto e já contém um plano para você explorar.</span><button type="button" onClick={() => setWelcome(false)} aria-label="Fechar">×</button></div>}
      <PageHeader eyebrow="Seu dia" title={`Bom dia, ${firstName(session?.name)}.`} description="Consistência é uma sequência de próximos passos possíveis. Este é o seu de hoje." actions={<ButtonLink href="/app/evolucao" variant="secondary"><TrendingUp size={17} /><span>Ver evolução</span></ButtonLink>} />
      <div className="stats-grid">
        <article className="stat-card"><div className="stat-card__top"><span className="stat-card__label">Treinos concluídos</span><span className="stat-card__icon"><Dumbbell size={18} /></span></div><div className="stat-card__value"><strong>{student?.completedWorkouts ?? 0}</strong><span>no ciclo</span></div><div className="stat-card__trend"><TrendingUp size={13} /> Histórico atualizado</div></article>
        <article className="stat-card"><div className="stat-card__top"><span className="stat-card__label">Frequência semanal</span><span className="stat-card__icon"><Target size={18} /></span></div><div className="stat-card__value"><strong>{student?.weeklyFrequency ?? 0}</strong><span>de 3</span></div><div className="stat-card__trend"><CheckCircle2 size={13} /> No ritmo planejado</div></article>
        <article className="stat-card"><div className="stat-card__top"><span className="stat-card__label">Sequência atual</span><span className="stat-card__icon"><Flame size={18} /></span></div><div className="stat-card__value"><strong>{student?.currentStreakDays ?? 0}</strong><span>dias</span></div><div className="stat-card__trend stat-card__trend--neutral">Sem culpa, um dia por vez</div></article>
        <article className="stat-card"><div className="stat-card__top"><span className="stat-card__label">Volume acumulado</span><span className="stat-card__icon"><Activity size={18} /></span></div><div className="stat-card__value"><strong>{number(student?.totalVolume ?? 0)}</strong><span>kg</span></div><div className="stat-card__trend"><TrendingUp size={13} /> Calculado pelas séries</div></article>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-stack">
          {plan ? <article className="today-workout">
            <div className="today-workout__copy"><div className="today-workout__meta"><span className="badge">Treino do dia</span><span className="badge">Versão {plan.version}</span></div><h2>{plan.name}</h2><p>{plan.objective} · {plan.exercises.length} exercícios · cerca de {plan.exercises.length * 16 + 18} min</p><Button type="button" onClick={start}>{currentSession ? "Retomar treino" : "Iniciar treino"}<ArrowRight size={17} /></Button></div>
            <div className="today-workout__progress" aria-label={`${workoutProgress}% concluído`}><span>{workoutProgress}%</span></div>
          </article> : <div className="empty-state"><div><span className="empty-state__icon"><Dumbbell size={22} /></span><h3>Nenhum treino ativo</h3><p>Seu professor ainda não publicou um plano. Quando isso acontecer, ele aparecerá aqui.</p></div></div>}

          <section className="panel">
            <header className="panel__header"><div><h2>Ritmo desta semana</h2><p>Treinos concluídos por dia, calculados do seu histórico.</p></div><Link className="panel__header-link" href="/app/historico">Histórico <ChevronRight size={14} /></Link></header>
            <div className="panel__body">
              <div className="week-progress" aria-label="Frequência semanal: dois treinos concluídos">
                {[20, 78, 18, 92, 12, 42, 8].map((height, index) => <div className={`week-progress__day${index === 3 ? " week-progress__day--active" : ""}`} key={index}><div className="week-progress__bar"><span style={{ height: `${height}%` }} /></div><label>{["S", "T", "Q", "Q", "S", "S", "D"][index]}</label></div>)}
              </div>
            </div>
          </section>

          <section className="panel"><header className="panel__header"><div><h2>Últimas sessões</h2><p>Os registros mais recentes do seu treino.</p></div><Link className="panel__header-link" href="/app/historico">Ver tudo</Link></header><div className="panel__body"><div className="list">{completed.slice(0, 3).map((item) => { const itemPlan = data.workoutPlans.find((candidate) => candidate.id === item.workoutPlanId); return <div className="list-row" key={item.id}><span className="list-row__icon"><CheckCircle2 size={18} /></span><span className="list-row__main"><strong>{itemPlan?.name ?? "Treino concluído"}</strong><small>{item.sets.filter((set) => set.status === "completed").length} séries registradas · esforço {item.perceivedEffort}/10</small></span><span className="list-row__aside">{item.completedAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(item.completedAt)) : "—"}</span></div>; })}</div></div></section>
        </div>

        <aside className="dashboard-stack">
          <section className="panel"><header className="panel__header"><div><h2>Meta semanal</h2><p>3 treinos planejados</p></div></header><div className="panel__body"><div className="progress-summary"><ProgressRing value={Math.min(100, Math.round(((student?.weeklyFrequency ?? 0) / 3) * 100))} /><div className="progress-summary__copy"><strong>{(student?.weeklyFrequency ?? 0) >= 3 ? "Meta alcançada" : "Você está avançando"}</strong><span>Falta pouco. Ajuste a semana ao que é possível para você.</span></div></div></div></section>
          {nextClass && <section className="panel"><header className="panel__header"><div><h2>Próxima aula</h2><p>Sua agenda na academia</p></div><Link className="panel__header-link" href="/app/aulas">Agenda</Link></header><div className="panel__body"><div className="list-row"><span className="list-row__icon"><CalendarDays size={18} /></span><span className="list-row__main"><strong>{nextClass.title}</strong><small>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).format(new Date(nextClass.startsAt))}</small></span><span className="list-row__aside">{time(nextClass.startsAt)}</span></div></div></section>}
          <section className="panel"><header className="panel__header"><div><h2>Ações rápidas</h2><p>Registre sem perder o ritmo</p></div></header><div className="panel__body"><div className="quick-actions"><Link href="/app/evolucao?nova=1" className="quick-action"><TrendingUp size={19} /><span>Nova medida</span></Link><Link href="/app/aulas" className="quick-action"><CalendarDays size={19} /><span>Reservar aula</span></Link><Link href="/app/historico" className="quick-action"><HistoryIcon /><span>Ver histórico</span></Link><Link href="/app/perfil" className="quick-action"><Target size={19} /><span>Ajustar meta</span></Link></div></div></section>
          <section className="panel"><header className="panel__header"><div><h2>Sinal de evolução</h2><p>Última medida registrada</p></div></header><div className="panel__body"><div className="list-row"><span className="list-row__icon"><Gauge size={18} /></span><span className="list-row__main"><strong>{student?.latestWeightKg ? `${student.latestWeightKg.toLocaleString("pt-BR")} kg` : "Sem registro"}</strong><small>{student?.weightDeltaKg ? `${student.weightDeltaKg > 0 ? "+" : ""}${student.weightDeltaKg.toLocaleString("pt-BR")} kg no período` : "Adicione medidas para comparar"}</small></span><Link className="table-action" href="/app/evolucao" aria-label="Ver evolução"><ChevronRight size={16} /></Link></div></div></section>
        </aside>
      </div>
    </>
  );
}

function HistoryIcon() { return <Clock3 size={19} />; }

function ProfessionalDashboard() {
  const { data, session, metrics, reset } = useDemoStore();
  const org = metrics.organization;
  const studentMemberships = data.memberships.filter((item) => item.role === "student");
  const students = studentMemberships.map((membership) => data.users.find((user) => user.id === membership.userId)).filter(Boolean);
  const recentSessions = data.workoutSessions.filter((item) => item.status === "completed").sort((a, b) => Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt));
  return <>
    <PageHeader eyebrow="Visão do professor" title={`Olá, ${firstName(session?.name)}.`} description="Veja quem avançou, quem precisa de atenção e qual é a melhor próxima ação." actions={<><Button variant="secondary" onClick={reset}><RefreshCcw size={16} /><span>Restaurar demo</span></Button><ButtonLink href="/app/treinos/novo"><Plus size={17} /><span>Novo treino</span></ButtonLink></>} />
    <div className="stats-grid">
      <Stat label="Alunos ativos" value={org?.activeStudents ?? 0} suffix={`de ${org?.students ?? 0}`} icon={UserCheck} trend="Com sessão nos últimos 30 dias" />
      <Stat label="Sem atividade" value={org?.inactiveStudents ?? 0} suffix="alunos" icon={UserMinus} trend="Merecem um contato gentil" neutral />
      <Stat label="Treinos no mês" value={org?.completedWorkoutsLast30Days ?? 0} suffix="concluídos" icon={Dumbbell} trend="Calculado do histórico" />
      <Stat label="Ocupação das aulas" value={org?.classOccupancyRate ?? 0} suffix="%" icon={CalendarDays} trend={`${org?.confirmedBookings ?? 0} reservas confirmadas`} />
    </div>
    <div className="dashboard-grid"><div className="dashboard-stack">
      <section className="panel"><header className="panel__header"><div><h2>Alunos para acompanhar</h2><p>Sinais recentes reunidos por prioridade.</p></div><Link className="panel__header-link" href="/app/alunos">Todos os alunos <ChevronRight size={14} /></Link></header><div className="panel__body"><div className="list">{students.map((student, index) => student && <Link href={`/app/alunos/${student.id}`} className="list-row" key={student.id}><span className="avatar">{initials(student.name)}</span><span className="list-row__main"><strong>{student.name}</strong><small>{index === 0 ? "Treino concluído há 18 min · feedback disponível" : "Sem treino nos últimos 7 dias"}</small></span><span className={`badge ${index === 0 ? "badge--success" : "badge--warning"}`}>{index === 0 ? "No ritmo" : "Atenção"}</span></Link>)}</div></div></section>
      <section className="panel"><header className="panel__header"><div><h2>Atividade recente</h2><p>Sessões concluídas pelos seus alunos.</p></div></header><div className="panel__body"><div className="list">{recentSessions.slice(0, 5).map((item) => { const student = data.users.find((user) => user.id === item.studentId); const plan = data.workoutPlans.find((candidate) => candidate.id === item.workoutPlanId); return <div className="list-row" key={item.id}><span className="list-row__icon"><Dumbbell size={18} /></span><span className="list-row__main"><strong>{student?.name ?? "Aluno"} · {plan?.name ?? "Treino"}</strong><small>{item.sets.filter((set) => set.status === "completed").length} séries · esforço {item.perceivedEffort}/10 · “{item.feedback || "Sem feedback"}”</small></span><span className="badge badge--success">Concluído</span></div>; })}</div></div></section>
    </div><aside className="dashboard-stack">
      <section className="panel"><header className="panel__header"><div><h2>Adesão dos alunos</h2><p>Atividade nos últimos 30 dias</p></div></header><div className="panel__body"><div className="progress-summary"><ProgressRing value={org?.students ? Math.round(((org.activeStudents ?? 0) / org.students) * 100) : 0} /><div className="progress-summary__copy"><strong>{org?.activeStudents ?? 0} alunos ativos</strong><span>Use o dado como ponto de conversa, nunca como cobrança.</span></div></div></div></section>
      <section className="panel"><header className="panel__header"><div><h2>Ações rápidas</h2><p>Continue o acompanhamento</p></div></header><div className="panel__body"><div className="quick-actions"><Link href="/app/treinos/novo" className="quick-action"><Plus size={19} /><span>Criar treino</span></Link><Link href="/app/alunos" className="quick-action"><UsersRound size={19} /><span>Ver alunos</span></Link><Link href="/app/aulas" className="quick-action"><CalendarDays size={19} /><span>Agenda</span></Link><Link href="/app/mensagens" className="quick-action"><Sparkles size={19} /><span>Feedbacks</span></Link></div></div></section>
      <section className="panel"><header className="panel__header"><div><h2>Alertas</h2><p>Prioridades sem alarmismo</p></div></header><div className="panel__body"><div className="list-row"><span className="list-row__icon"><UserMinus size={18} /></span><span className="list-row__main"><strong>{org?.inactiveStudents ?? 0} aluno sem atividade</strong><small>Considere enviar uma mensagem acolhedora.</small></span></div></div></section>
    </aside></div>
  </>;
}

function OrganizationDashboard() {
  const { data, session, metrics, reset } = useDemoStore();
  const org = metrics.organization;
  const upcoming = data.classSessions.filter((item) => item.status === "scheduled").sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return <>
    <PageHeader eyebrow="Operação" title={session?.organizationName ?? "Sua academia"} description="Indicadores derivados da atividade real da organização, sem expor informações clínicas." actions={<><Button variant="secondary" onClick={reset}><RefreshCcw size={16} /><span>Restaurar demo</span></Button><ButtonLink href="/app/aulas?nova=1"><Plus size={17} /><span>Nova aula</span></ButtonLink></>} />
    <div className="stats-grid"><Stat label="Alunos" value={org?.students ?? 0} suffix="cadastrados" icon={UsersRound} trend={`${org?.activeStudents ?? 0} ativos no período`} /><Stat label="Profissionais" value={org?.professionals ?? 0} suffix="na equipe" icon={UserCheck} trend="Permissões por vínculo" /><Stat label="Reservas" value={org?.confirmedBookings ?? 0} suffix="confirmadas" icon={CalendarDays} trend={`${org?.waitlistedBookings ?? 0} em espera`} /><Stat label="Ocupação" value={org?.classOccupancyRate ?? 0} suffix="%" icon={Gauge} trend="Capacidade programada" /></div>
    <div className="dashboard-grid"><div className="dashboard-stack">
      <section className="panel"><header className="panel__header"><div><h2>Ocupação das próximas aulas</h2><p>Reservas confirmadas versus capacidade.</p></div><Link href="/app/aulas" className="panel__header-link">Gerenciar agenda <ChevronRight size={14} /></Link></header><div className="panel__body"><div className="list">{upcoming.map((classSession) => { const confirmed = data.classBookings.filter((booking) => booking.classSessionId === classSession.id && booking.status === "confirmed").length; const percent = Math.round((confirmed / classSession.capacity) * 100); return <div className="list-row" key={classSession.id}><span className="list-row__icon"><CalendarDays size={18} /></span><span className="list-row__main"><strong>{classSession.title}</strong><small>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(classSession.startsAt))} · {confirmed}/{classSession.capacity} vagas</small></span><span className={`badge ${percent >= 90 ? "badge--warning" : "badge--success"}`}>{percent}%</span></div>; })}</div></div></section>
      <section className="panel"><header className="panel__header"><div><h2>Atividade da academia</h2><p>Leitura operacional dos últimos 30 dias.</p></div></header><div className="panel__body"><div className="week-progress">{[58, 76, 65, 88, 72, 95, 45].map((height, index) => <div className="week-progress__day" key={index}><div className="week-progress__bar"><span style={{ height: `${height}%` }} /></div><label>{["S", "T", "Q", "Q", "S", "S", "D"][index]}</label></div>)}</div><div className="chart-summary"><span><strong>{org?.completedWorkoutsLast30Days ?? 0}</strong> treinos concluídos</span><span><strong>{org?.confirmedBookings ?? 0}</strong> reservas</span><span><strong>{org?.activeStudents ?? 0}</strong> alunos ativos</span></div></div></section>
    </div><aside className="dashboard-stack"><section className="panel"><header className="panel__header"><div><h2>Saúde da base</h2><p>Atividade dos alunos no período</p></div></header><div className="panel__body"><div className="progress-summary"><ProgressRing value={org?.students ? Math.round((org.activeStudents / org.students) * 100) : 0} /><div className="progress-summary__copy"><strong>{org?.activeStudents ?? 0} ativos</strong><span>{org?.inactiveStudents ?? 0} precisam de uma reaproximação cuidadosa.</span></div></div></div></section><section className="panel"><header className="panel__header"><div><h2>Acesso rápido</h2><p>Operação diária</p></div></header><div className="panel__body"><div className="quick-actions"><Link href="/app/pessoas" className="quick-action"><UsersRound size={19} /><span>Pessoas</span></Link><Link href="/app/aulas?nova=1" className="quick-action"><Plus size={19} /><span>Nova aula</span></Link><Link href="/app/relatorios" className="quick-action"><BarChart3 size={19} /><span>Relatórios</span></Link><Link href="/app/organizacao" className="quick-action"><Building2 size={19} /><span>Organização</span></Link></div></div></section></aside></div>
  </>;
}

function SaasDashboard() {
  const { data, metrics, reset } = useDemoStore();
  const saas = metrics.saas;
  const estimatedMrr = data.subscriptions.reduce((total, sub) => total + ({ personal: 49, essential: 199, professional: 399, network: 899 }[sub.planCode] ?? 0), 0);
  return <>
    <PageHeader eyebrow="Ativelo SaaS" title="Visão da plataforma" description="Uso, planos e saúde operacional sem acesso desnecessário a treinos ou dados físicos." actions={<Button variant="secondary" onClick={reset}><RefreshCcw size={16} /><span>Restaurar demo</span></Button>} />
    <div className="stats-grid"><Stat label="Academias" value={saas?.organizations ?? 0} suffix="organizações" icon={Building2} trend={`${saas?.activeOrganizations ?? 0} ativas`} /><Stat label="Trials" value={saas?.trials ?? 0} suffix="em teste" icon={Sparkles} trend="Conversão acompanhada" /><Stat label="MRR estimado" value={`R$ ${number(estimatedMrr)}`} suffix="demo" icon={CircleDollarSign} trend="Sem cobrança real" /><Stat label="Disponibilidade" value="99,9" suffix="% alvo" icon={Activity} trend="Observabilidade preparada" /></div>
    <div className="dashboard-grid"><div className="dashboard-stack"><section className="panel"><header className="panel__header"><div><h2>Organizações clientes</h2><p>Metadados operacionais e limites do plano.</p></div><Link href="/app/plataforma" className="panel__header-link">Ver todas <ChevronRight size={14} /></Link></header><div className="panel__body"><div className="list">{data.organizations.map((organization) => { const sub = data.subscriptions.find((item) => item.organizationId === organization.id); return <Link href={`/app/plataforma/${organization.id}`} className="list-row" key={organization.id}><span className="list-row__icon"><Building2 size={18} /></span><span className="list-row__main"><strong>{organization.name}</strong><small>Plano {sub?.planCode ?? "sem plano"} · limite de {sub?.studentLimit ?? 0} alunos</small></span><span className={`badge ${organization.status === "active" ? "badge--success" : organization.status === "trial" ? "badge--warning" : "badge--danger"}`}>{organization.status === "active" ? "Ativa" : organization.status === "trial" ? "Trial" : "Suspensa"}</span></Link>; })}</div></div></section><section className="panel"><header className="panel__header"><div><h2>Distribuição por plano</h2><p>Assinaturas atuais da demonstração.</p></div></header><div className="panel__body"><div className="week-progress">{Object.entries(saas?.subscriptionsByPlan ?? {}).map(([plan, count]) => <div className="week-progress__day" key={plan}><div className="week-progress__bar"><span style={{ height: `${Math.max(18, count * 55)}%` }} /></div><label>{plan.slice(0, 4)}</label></div>)}</div></div></section></div><aside className="dashboard-stack"><section className="panel"><header className="panel__header"><div><h2>Conversão de trials</h2><p>Cenário demonstrativo</p></div></header><div className="panel__body"><div className="progress-summary"><ProgressRing value={50} /><div className="progress-summary__copy"><strong>1 de 2 no ciclo</strong><span>Indicador estimado; integrar eventos de billing em produção.</span></div></div></div></section><section className="panel"><header className="panel__header"><div><h2>Operação protegida</h2><p>Privilégio mínimo</p></div></header><div className="panel__body"><div className="list-row"><span className="list-row__icon"><ShieldSmall /></span><span className="list-row__main"><strong>Dados clínicos não disponíveis</strong><small>Admin SaaS vê uso agregado, planos e metadados.</small></span></div></div></section></aside></div>
  </>;
}

function ShieldSmall() { return <Award size={18} />; }

function Stat({ label, value, suffix, icon: Icon, trend, neutral = false }: { label: string; value: string | number; suffix: string; icon: typeof Activity; trend: string; neutral?: boolean }) {
  return <article className="stat-card"><div className="stat-card__top"><span className="stat-card__label">{label}</span><span className="stat-card__icon"><Icon size={18} /></span></div><div className="stat-card__value"><strong>{typeof value === "number" ? number(value) : value}</strong><span>{suffix}</span></div><div className={`stat-card__trend${neutral ? " stat-card__trend--neutral" : ""}`}>{neutral ? <Gauge size={13} /> : <TrendingUp size={13} />}{trend}</div></article>;
}

export function DashboardScreen() {
  const { session } = useDemoStore();
  if (!session) return null;
  if (session.role === "student") return <StudentDashboard />;
  if (session.role === "professional") return <ProfessionalDashboard />;
  if (session.role === "organization_admin") return <OrganizationDashboard />;
  return <SaasDashboard />;
}
