"use client";

import { Award, Check, CheckCircle2, ChevronLeft, Clock3, Info, Pause, Play, SkipForward, WifiOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { useDemoStore } from "@/lib/demo-store";

function formatTimer(total: number) { const safe = Math.max(0, total); const minutes = Math.floor(safe / 60); const seconds = safe % 60; return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`; }

export function WorkoutSessionScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { data, session: authSession, recordWorkoutSet, skipWorkoutSet, completeWorkoutSession } = useDemoStore();
  const workoutSession = data.workoutSessions.find((item) => item.id === sessionId);
  const plan = data.workoutPlans.find((item) => item.id === workoutSession?.workoutPlanId);
  const [elapsed, setElapsed] = useState(() => workoutSession ? Math.max(0, Math.floor((Date.now() - Date.parse(workoutSession.startedAt)) / 1000)) : 0);
  const [paused, setPaused] = useState(false);
  const [online, setOnline] = useState(true);
  const [rest, setRest] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [rpe, setRpe] = useState(7);
  const [feedback, setFeedback] = useState("");

  useEffect(() => { setOnline(navigator.onLine); const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  useEffect(() => { if (paused || workoutSession?.status !== "in_progress") return; const id = window.setInterval(() => setElapsed((value) => value + 1), 1000); return () => window.clearInterval(id); }, [paused, workoutSession?.status]);
  useEffect(() => { if (rest <= 0) return; const id = window.setInterval(() => setRest((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id); }, [rest]);

  const grouped = useMemo(() => plan?.exercises.map((prescription) => ({ prescription, exercise: data.exercises.find((item) => item.id === prescription.exerciseId), sets: workoutSession?.sets.filter((set) => set.workoutExerciseId === prescription.id) ?? [] })) ?? [], [plan, data.exercises, workoutSession]);
  const completedCount = workoutSession?.sets.filter((set) => set.status !== "pending").length ?? 0;
  const totalSets = workoutSession?.sets.length ?? 0;
  const progress = Math.round((completedCount / Math.max(1, totalSets)) * 100);
  const currentGroupIndex = grouped.findIndex((group) => group.sets.some((set) => set.status === "pending"));

  if (!workoutSession || !plan || authSession?.role !== "student") return <div className="access-denied"><div><span className="access-denied__icon"><Info size={30} /></span><h1>Sessão não encontrada</h1><p>Ela pode pertencer a outra organização ou não estar disponível para este perfil.</p><Button type="button" onClick={() => router.replace("/app/treinos")}>Voltar aos treinos</Button></div></div>;

  function previousMax(exerciseId: string) { return data.workoutSessions.filter((item) => item.id !== workoutSession.id && item.status === "completed").flatMap((item) => item.sets).filter((set) => set.exerciseId === exerciseId && set.status === "completed").reduce((max, set) => Math.max(max, set.load ?? 0), 0); }
  function leave() { if (window.confirm("Sair do modo de treino? Seu progresso está salvo e você poderá continuar depois.")) router.push("/app/treinos"); }
  function record(setId: string, prescription: typeof plan.exercises[number], repetitions: number, load: number) { const result = recordWorkoutSet({ sessionId, setId, repetitions, load }); if (result.ok) setRest(prescription.restSeconds); }
  function finish() { const result = completeWorkoutSession({ sessionId, perceivedEffort: rpe, feedback }); if (result.ok) { setFinishOpen(false); router.push(`/app/historico?concluido=${sessionId}`); } }

  return <div className="workout-focus">
    {!online && <div className="offline-banner" role="status"><WifiOff size={15} /> Sem conexão. A sessão continua salva localmente.</div>}
    <header className="workout-focus__header"><div className="container workout-focus__top"><div className="workout-focus__back"><Button variant="ghost" size="sm" onClick={leave}><ChevronLeft size={17} /><span>Sair</span></Button></div><div className="workout-focus__title"><strong>{plan.name}</strong><small>Salvamento automático ativo</small></div><button className="workout-focus__timer button button--secondary button--sm" type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Retomar cronômetro" : "Pausar cronômetro"}>{paused ? <Play size={15} /> : <Pause size={15} />}{formatTimer(elapsed)}</button></div><div className="workout-focus__progress"><span style={{ width: `${progress}%` }} /></div></header>
    <div className="workout-focus__body">
      <div className="workout-exercises">{grouped.map((group, groupIndex) => { if (!group.exercise) return null; const max = previousMax(group.exercise.id); const groupDone = group.sets.every((set) => set.status !== "pending"); return <article className={`exercise-session-card${groupIndex === currentGroupIndex ? " exercise-session-card--current" : ""}`} key={group.prescription.id}><header className="exercise-session-card__head"><span className="exercise-session-card__index">{(groupIndex + 1).toString().padStart(2, "0")}</span><div><h2>{group.exercise.name}</h2><p>{group.exercise.equipment} · {group.prescription.sets} × {group.prescription.repetitions} · descanso {group.prescription.restSeconds}s</p></div>{groupDone ? <span className="badge badge--success"><CheckCircle2 size={13} /> Feito</span> : groupIndex === currentGroupIndex ? <span className="badge badge--brand">Agora</span> : <span className="badge">A seguir</span>}</header><div className="exercise-session-card__body"><details className="exercise-instructions"><summary>Ver instruções e cuidados</summary><ol>{group.exercise.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}<li>{group.prescription.notes}</li></ol></details><table className="set-table"><thead><tr><th>Série</th><th>Reps</th><th>Anterior</th><th>Carga</th><th>Ação</th></tr></thead><tbody>{group.sets.map((set) => <SetRow key={set.id} set={set} target={group.prescription.repetitions} suggestion={group.prescription.suggestedLoad} previousMax={max} onRecord={(repetitions, load) => record(set.id, group.prescription, repetitions, load)} onSkip={() => skipWorkoutSet({ sessionId, setId: set.id })} />)}</tbody></table></div></article>; })}</div>
      <aside className="panel workout-overview"><span className="eyebrow">Sessão em andamento</span><h2>{plan.name}</h2><p>{plan.objective}</p><div className="workout-progress-count"><div><strong>{completedCount}/{totalSets}</strong><span>séries registradas</span></div><div><strong>{progress}%</strong><span>do treino</span></div></div><div className="workout-outline">{grouped.map((group, index) => { const done = group.sets.every((set) => set.status !== "pending"); return <div className={`workout-outline__item${index === currentGroupIndex ? " workout-outline__item--current" : ""}`} key={group.prescription.id}><span className="workout-outline__number">{done ? <Check size={14} /> : index + 1}</span><strong>{group.exercise?.name}</strong><small>{group.sets.filter((set) => set.status !== "pending").length}/{group.sets.length}</small></div>; })}</div></aside>
    </div>
    {rest > 0 && <div className="workout-rest" role="timer" aria-live={rest <= 5 ? "assertive" : "off"}><span className="workout-rest__ring"><Clock3 size={18} /></span><span><strong>Tempo de descanso</strong><small>Respire e prepare a próxima série.</small></span><span className="workout-rest__time">{formatTimer(rest)}</span><button className="sr-only" type="button" onClick={() => setRest(0)}>Pular descanso</button></div>}
    <footer className="workout-bottom"><div className="workout-bottom__inner"><div className="workout-bottom__status"><strong>{completedCount === totalSets ? "Treino pronto para finalizar" : `${totalSets - completedCount} séries restantes`}</strong><span>Cada alteração é salva automaticamente.</span></div><Button size="lg" disabled={completedCount !== totalSets} onClick={() => setFinishOpen(true)}>Finalizar treino <CheckCircle2 size={18} /></Button></div></footer>
    {finishOpen && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="finish-title"><header className="modal__header"><div><h2 id="finish-title">Como foi seu treino?</h2><p>Este feedback ajuda o profissional a ajustar a próxima sessão.</p></div><button className="modal__close" type="button" onClick={() => setFinishOpen(false)} aria-label="Fechar"><X size={18} /></button></header><div className="modal__body"><div className="finish-summary"><div><strong>{formatTimer(elapsed)}</strong><span>duração</span></div><div><strong>{completedCount}</strong><span>séries</span></div><div><strong>{workoutSession.sets.reduce((total, set) => total + ((set.load ?? 0) * (set.repetitions ?? 0)), 0).toLocaleString("pt-BR")}</strong><span>volume kg</span></div></div><span className="field__label">Esforço percebido · {rpe}/10</span><div className="rpe-grid">{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <button className={`rpe-button${rpe === value ? " rpe-button--active" : ""}`} type="button" onClick={() => setRpe(value)} key={value}>{value}</button>)}</div><TextareaField label="Comentário opcional" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Conte o que funcionou ou o que precisa de ajuste." /></div><footer className="modal__footer"><Button variant="secondary" onClick={() => setFinishOpen(false)}>Continuar treino</Button><Button onClick={finish}>Salvar e concluir</Button></footer></section></div>}
  </div>;
}

type SetLike = { id: string; setNumber: number; repetitions: number | null; load: number | null; status: "pending" | "completed" | "skipped" };
function SetRow({ set, target, suggestion, previousMax, onRecord, onSkip }: { set: SetLike; target: number; suggestion: number; previousMax: number; onRecord: (reps: number, load: number) => void; onSkip: () => void }) {
  const [reps, setReps] = useState(set.repetitions ?? target);
  const [load, setLoad] = useState(set.load ?? (previousMax || suggestion));
  const done = set.status === "completed";
  const skipped = set.status === "skipped";
  const isRecord = done && (set.load ?? 0) > previousMax && previousMax > 0;
  return <tr data-complete={done || skipped}><td><span className="set-number">{set.setNumber}</span></td><td><input className="set-input" type="number" min="0" max="200" value={reps} onChange={(event) => setReps(Number(event.target.value))} disabled={done || skipped} aria-label={`Repetições da série ${set.setNumber}`} /></td><td>{previousMax > 0 ? `${previousMax} kg` : "—"}</td><td><input className="set-input" type="number" min="0" step="0.5" value={load} onChange={(event) => setLoad(Number(event.target.value))} disabled={done || skipped} aria-label={`Carga da série ${set.setNumber}`} />{isRecord && <span className="record-badge"><Award size={11} /> recorde</span>}</td><td>{done ? <span className="set-action set-action--done"><Check size={17} /></span> : skipped ? <span className="badge">Pulada</span> : <span style={{ display: "flex", alignItems: "center", gap: 4 }}><button className="set-action" type="button" onClick={() => onRecord(reps, load)} aria-label={`Concluir série ${set.setNumber}`}><Check size={17} /></button><button className="set-skip" type="button" onClick={onSkip}><SkipForward size={12} /> pular</button></span>}</td></tr>;
}
