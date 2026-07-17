"use client";

import type { WorkoutExercisePrescription } from "@ativelo/core";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Dumbbell,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { useDemoStore } from "@/lib/demo-store";

const muscleNames: Record<string, string> = { chest: "Peito", back: "Costas", shoulders: "Ombros", arms: "Braços", legs: "Pernas", glutes: "Glúteos", core: "Core", full_body: "Corpo todo" };

export function WorkoutsScreen() {
  const router = useRouter();
  const { data, session, startWorkoutSession, createWorkoutPlan } = useDemoStore();
  const [query, setQuery] = useState("");
  if (!session) return null;
  const plans = data.workoutPlans.filter((plan) => plan.name.toLowerCase().includes(query.toLowerCase()));

  function begin(planId: string) {
    const inProgress = data.workoutSessions.find((item) => item.workoutPlanId === planId && item.status === "in_progress");
    if (inProgress) { router.push(`/app/sessoes/${inProgress.id}`); return; }
    const result = startWorkoutSession({ workoutPlanId: planId });
    if (result.ok) router.push(`/app/sessoes/${result.value.id}`);
  }

  function duplicate(planId: string) {
    const plan = data.workoutPlans.find((item) => item.id === planId);
    if (!plan) return;
    createWorkoutPlan({ studentId: plan.studentId, name: `${plan.name} · cópia`, objective: plan.objective, scheduledWeekdays: plan.scheduledWeekdays, exercises: plan.exercises.map((exercise) => ({ ...exercise, id: `copy-${exercise.id}-${Date.now()}` })) });
  }

  const isStudent = session.role === "student";
  return <>
    <PageHeader eyebrow={isStudent ? "Sua programação" : "Prescrição"} title={isStudent ? "Seus treinos" : "Treinos e prescrições"} description={isStudent ? "Planos ativos e sessões em andamento, sempre salvos neste dispositivo." : "Crie modelos reutilizáveis e publique uma versão segura para cada aluno."} actions={isStudent ? undefined : <ButtonLink href="/app/treinos/novo"><Plus size={17} /><span>Novo treino</span></ButtonLink>} />
    <div className="filter-bar"><label className="search-field"><Search size={18} /><span className="sr-only">Buscar treino</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou objetivo" /></label><div className="filter-actions"><span className="badge badge--brand">{plans.length} {plans.length === 1 ? "plano" : "planos"}</span></div></div>
    {plans.length === 0 ? <div className="empty-state"><div><span className="empty-state__icon"><Dumbbell size={23} /></span><h3>Nenhum treino encontrado</h3><p>{query ? "Tente outro termo de busca." : isStudent ? "Seu professor ainda não publicou um treino." : "Crie a primeira prescrição para começar."}</p>{!isStudent && <ButtonLink href="/app/treinos/novo"><Plus size={16} /> Criar treino</ButtonLink>}</div></div> : <div className="cards-grid">{plans.map((plan) => { const student = data.users.find((user) => user.id === plan.studentId); const current = data.workoutSessions.find((item) => item.workoutPlanId === plan.id && item.status === "in_progress"); return <article className="workout-card" key={plan.id}><div className="workout-card__top"><span className="workout-card__icon"><Dumbbell size={21} /></span><span className={`badge ${plan.active ? "badge--success" : ""}`}>{plan.active ? "Ativo" : "Rascunho"}</span></div><h3>{plan.name}</h3><p>{plan.objective}</p><div className="workout-card__meta"><span><Dumbbell size={14} /> {plan.exercises.length} exercícios</span><span><Clock3 size={14} /> ~{plan.exercises.length * 16 + 18} min</span>{!isStudent && <span><UsersRound size={14} /> {student?.name ?? "Aluno"}</span>}</div><div className="workout-card__footer"><span className="badge">v{plan.version}</span>{isStudent ? <Button size="sm" onClick={() => begin(plan.id)}>{current ? "Retomar" : "Iniciar"} <ArrowRight size={15} /></Button> : <Button size="sm" variant="secondary" onClick={() => duplicate(plan.id)}><Copy size={14} /> Duplicar</Button>}</div></article>; })}</div>}
  </>;
}

type DraftPrescription = WorkoutExercisePrescription & { exerciseName: string; equipment: string };

export function WorkoutBuilderScreen() {
  const router = useRouter();
  const { data, session, createWorkoutPlan } = useDemoStore();
  const students = useMemo(() => data.memberships.filter((item) => item.role === "student").map((membership) => data.users.find((user) => user.id === membership.userId)).filter((item): item is NonNullable<typeof item> => Boolean(item)), [data]);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [selected, setSelected] = useState<DraftPrescription[]>([]);
  const [validationError, setValidationError] = useState<string>();

  if (session?.role !== "professional") return <AccessBuilderDenied />;

  function toggleExercise(exerciseId: string) {
    const exercise = data.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    setSelected((current) => current.some((item) => item.exerciseId === exerciseId) ? current.filter((item) => item.exerciseId !== exerciseId).map((item, index) => ({ ...item, order: index })) : [...current, { id: `draft-${exerciseId}-${Date.now()}`, exerciseId, order: current.length, sets: 3, repetitions: 10, suggestedLoad: exercise.equipment === "Peso corporal" ? 0 : 10, loadUnit: exercise.equipment === "Peso corporal" ? "bodyweight" : "kg", restSeconds: 60, notes: "Execução controlada e confortável.", exerciseName: exercise.name, equipment: exercise.equipment }]);
  }

  function update(exerciseId: string, patch: Partial<DraftPrescription>) { setSelected((current) => current.map((item) => item.exerciseId === exerciseId ? { ...item, ...patch } : item)); }

  function save() {
    if (!studentId || name.trim().length < 3 || objective.trim().length < 5 || selected.length === 0) { setValidationError("Preencha aluno, nome, objetivo e selecione pelo menos um exercício."); return; }
    const result = createWorkoutPlan({ studentId, name: name.trim(), objective: objective.trim(), scheduledWeekdays: weekdays, exercises: selected.map(({ exerciseName: _exerciseName, equipment: _equipment, ...item }) => item) });
    if (result.ok) router.push("/app/treinos"); else setValidationError(result.error);
  }

  return <>
    <PageHeader eyebrow="Nova prescrição" title="Monte o próximo treino" description="Selecione exercícios e defina uma orientação inicial. O plano publicado fica vinculado ao aluno e à organização." actions={<ButtonLink href="/app/treinos" variant="secondary"><ArrowLeft size={16} /><span>Voltar</span></ButtonLink>} />
    {validationError && <div className="auth-error" role="alert"><Info size={18} /> {validationError}</div>}
    <div className="builder-layout">
      <div className="dashboard-stack">
        <section className="panel builder-section"><h2>Informações do plano</h2><p>Use um nome fácil de reconhecer durante o treino.</p><div className="builder-fields"><SelectField label="Aluno" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Selecione</option>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</SelectField><Field label="Nome do treino" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Força essencial B" /><div className="field--full"><TextareaField label="Objetivo e orientação" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Descreva o foco desta fase em linguagem simples." /></div></div><div className="field" style={{ marginTop: 16 }}><span className="field__label">Dias programados</span><div className="filter-actions">{[[1,"Seg"],[2,"Ter"],[3,"Qua"],[4,"Qui"],[5,"Sex"],[6,"Sáb"]].map(([day, label]) => <Button type="button" size="sm" variant={weekdays.includes(day as number) ? "primary" : "secondary"} key={day} onClick={() => setWeekdays((current) => current.includes(day as number) ? current.filter((item) => item !== day) : [...current, day as number])}>{label}</Button>)}</div></div></section>
        <section className="panel builder-section"><h2>Biblioteca de exercícios</h2><p>Conteúdo original e demonstrativo. Selecione para adicionar à prescrição.</p><div className="exercise-picker">{data.exercises.filter((item) => item.active).map((exercise) => <label className="exercise-option" key={exercise.id}><input type="checkbox" checked={selected.some((item) => item.exerciseId === exercise.id)} onChange={() => toggleExercise(exercise.id)} /><span><strong>{exercise.name}</strong><small>{exercise.equipment} · {exercise.description}</small></span><span className="exercise-option__tag">{muscleNames[exercise.primaryMuscleGroup]}</span></label>)}</div></section>
        {selected.length > 0 && <section className="panel builder-section"><h2>Séries e parâmetros</h2><p>Ajuste a sugestão inicial para cada exercício.</p><div className="prescription-list">{selected.map((item) => <div className="prescription-row" key={item.exerciseId}><span className="prescription-row__name"><strong>{item.exerciseName}</strong><small>{item.equipment}</small></span><span className="mini-field"><label>Séries</label><input type="number" min="1" max="12" value={item.sets} onChange={(event) => update(item.exerciseId, { sets: Number(event.target.value) })} /></span><span className="mini-field"><label>Reps</label><input type="number" min="1" max="100" value={item.repetitions} onChange={(event) => update(item.exerciseId, { repetitions: Number(event.target.value) })} /></span><span className="mini-field"><label>Carga kg</label><input type="number" min="0" step="0.5" value={item.suggestedLoad} onChange={(event) => update(item.exerciseId, { suggestedLoad: Number(event.target.value) })} /></span><span className="mini-field"><label>Descanso</label><input type="number" min="10" step="5" value={item.restSeconds} onChange={(event) => update(item.exerciseId, { restSeconds: Number(event.target.value) })} /></span><button className="table-action" type="button" onClick={() => toggleExercise(item.exerciseId)} aria-label={`Remover ${item.exerciseName}`}><MoreHorizontal size={16} /></button></div>)}</div></section>}
      </div>
      <aside><section className="panel builder-summary"><span className="eyebrow">Resumo</span><h2>{name || "Novo treino"}</h2><div className="builder-summary__metric"><span>Aluno</span><strong>{students.find((item) => item.id === studentId)?.name ?? "Não selecionado"}</strong></div><div className="builder-summary__metric"><span>Exercícios</span><strong>{selected.length}</strong></div><div className="builder-summary__metric"><span>Séries totais</span><strong>{selected.reduce((total, item) => total + item.sets, 0)}</strong></div><div className="builder-summary__metric"><span>Tempo estimado</span><strong>~{selected.length * 16 + 18} min</strong></div><div className="builder-summary__metric"><span>Frequência</span><strong>{weekdays.length}x/semana</strong></div><Button type="button" size="lg" onClick={save}><CheckCircle2 size={17} /> Publicar para o aluno</Button><div className="builder-note"><Info size={15} /> A versão será registrada. Alterações futuras devem gerar uma nova versão em produção.</div></section></aside>
    </div>
  </>;
}

function AccessBuilderDenied() { return <div className="access-denied"><div><span className="access-denied__icon"><Target size={30} /></span><h1>Acesso restrito</h1><p>Somente profissionais vinculados podem criar prescrições neste fluxo.</p><ButtonLink href="/app/inicio">Voltar ao início</ButtonLink></div></div>; }
