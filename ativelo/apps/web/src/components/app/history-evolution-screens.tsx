"use client";

import { calculateSessionDurationMinutes, calculateSessionVolume } from "@ativelo/core";
import {
  Activity,
  ArrowDown,
  CheckCircle2,
  Clock3,
  Download,
  Dumbbell,
  Info,
  Plus,
  TrendingUp,
  X
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useDemoStore } from "@/lib/demo-store";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
}

function SimpleBarChart({
  items,
  valueKey,
  labelKey,
  unit,
  ariaLabel
}: {
  items: Array<Record<string, string | number | null | undefined>>;
  valueKey: string;
  labelKey: string;
  unit: string;
  ariaLabel: string;
}) {
  const values = items.map((item) => Number(item[valueKey] ?? 0));
  const max = Math.max(...values, 1);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <p>Sem dados suficientes para o gráfico.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simple-chart" role="img" aria-label={ariaLabel}>
      <div className="simple-chart__bars">
        {items.map((item, index) => {
          const value = Number(item[valueKey] ?? 0);
          const height = Math.max(8, Math.round((value / max) * 100));
          return (
            <div className="simple-chart__col" key={`${item[labelKey]}-${index}`}>
              <span className="simple-chart__value">
                {value.toLocaleString("pt-BR")}
                {unit ? ` ${unit}` : ""}
              </span>
              <div className="simple-chart__track">
                <span style={{ height: `${height}%` }} />
              </div>
              <label>{String(item[labelKey] ?? "")}</label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const params = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(Boolean(params.get("concluido")));
  const { data, session } = useDemoStore();

  if (session?.role !== "student") return <Restricted />;

  const sessions = data.workoutSessions
    .filter((item) => item.status === "completed")
    .sort(
      (a, b) =>
        Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt),
    );
  const totalVolume = sessions.reduce((total, item) => total + calculateSessionVolume(item), 0);
  const averageEffort = sessions.length
    ? sessions.reduce((total, item) => total + (item.perceivedEffort ?? 0), 0) / sessions.length
    : 0;

  function exportCsv() {
    const rows = [
      ["data", "treino", "duracao_min", "series", "volume_kg", "esforco"],
      ...sessions.map((item) => {
        const plan = data.workoutPlans.find((candidate) => candidate.id === item.workoutPlanId);
        return [
          item.completedAt ?? item.startedAt,
          plan?.name ?? "Treino",
          calculateSessionDurationMinutes(item) ?? 0,
          item.sets.filter((set) => set.status === "completed").length,
          calculateSessionVolume(item),
          item.perceivedEffort ?? ""
        ];
      })
    ];
    const blob = new Blob(
      [
        rows
          .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
          .join("\n")
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ativelo-historico-demo.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {showSuccess && (
        <div className="welcome-banner" role="status">
          <CheckCircle2 size={19} />
          <span>
            <strong>Treino concluído e salvo.</strong> Seu histórico, volume e indicadores já foram
            atualizados.
          </span>
          <button type="button" onClick={() => setShowSuccess(false)} aria-label="Fechar">
            ×
          </button>
        </div>
      )}
      <PageHeader
        eyebrow="Seu histórico"
        title="Cada sessão conta uma parte da evolução"
        description="Consulte cargas, volume, duração e a percepção registrada ao finalizar."
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={16} />
            <span>Exportar CSV</span>
          </Button>
        }
      />
      <div className="stats-grid">
        <HistoryStat
          label="Sessões concluídas"
          value={sessions.length}
          suffix="treinos"
          icon={CheckCircle2}
        />
        <HistoryStat
          label="Volume total"
          value={totalVolume.toLocaleString("pt-BR")}
          suffix="kg"
          icon={Activity}
        />
        <HistoryStat
          label="Duração média"
          value={
            sessions.length
              ? Math.round(
                  sessions.reduce(
                    (total, item) => total + (calculateSessionDurationMinutes(item) ?? 0),
                    0,
                  ) / sessions.length,
                )
              : 0
          }
          suffix="min"
          icon={Clock3}
        />
        <HistoryStat
          label="Esforço médio"
          value={averageEffort.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          suffix="/10"
          icon={TrendingUp}
        />
      </div>
      {sessions.length === 0 ? (
        <div className="empty-state">
          <div>
            <span className="empty-state__icon">
              <Dumbbell size={22} />
            </span>
            <h3>O histórico começa no primeiro treino</h3>
            <p>Conclua uma sessão para ver os registros aqui.</p>
          </div>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map((item) => {
            const plan = data.workoutPlans.find((candidate) => candidate.id === item.workoutPlanId);
            const date = new Date(item.completedAt ?? item.startedAt);
            return (
              <article className="history-card" key={item.id}>
                <span className="history-card__date">
                  <span>
                    <strong>{date.getDate().toString().padStart(2, "0")}</strong>
                    <span>
                      {new Intl.DateTimeFormat("pt-BR", { month: "short" })
                        .format(date)
                        .replace(".", "")}
                    </span>
                  </span>
                </span>
                <div className="history-card__main">
                  <h2>{plan?.name ?? "Treino concluído"}</h2>
                  <p>{item.feedback || "Sem comentário após a sessão."}</p>
                  <div className="history-card__metrics">
                    <span>
                      <Clock3 size={13} /> {calculateSessionDurationMinutes(item) ?? 0} min
                    </span>
                    <span>
                      <Dumbbell size={13} />{" "}
                      {item.sets.filter((set) => set.status === "completed").length} séries
                    </span>
                    <span>
                      <Activity size={13} /> {calculateSessionVolume(item).toLocaleString("pt-BR")}{" "}
                      kg
                    </span>
                  </div>
                </div>
                <div className="history-card__score">
                  <strong>{item.perceivedEffort ?? "—"}/10</strong>
                  <span>esforço</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function HistoryStat({
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
      <div className="stat-card__trend stat-card__trend--neutral">Dados das sessões salvas</div>
    </article>
  );
}

export function EvolutionScreen() {
  const params = useSearchParams();
  const { data, session, metrics, addBodyMeasurement } = useDemoStore();
  const [modalOpen, setModalOpen] = useState(params.get("nova") === "1");
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [waist, setWaist] = useState("");
  const [error, setError] = useState<string>();

  const measurements = useMemo(
    () =>
      [...data.bodyMeasurements].sort(
        (a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt),
      ),
    [data.bodyMeasurements],
  );
  const chartData = useMemo(
    () =>
      measurements.map((item) => ({
        date: dateLabel(item.measuredAt),
        peso: item.weightKg
      })),
    [measurements],
  );
  const volumeBySession = useMemo(
    () =>
      data.workoutSessions
        .filter((item) => item.status === "completed")
        .map((item) => ({
          date: dateLabel(item.completedAt ?? item.startedAt),
          volume: calculateSessionVolume(item)
        })),
    [data.workoutSessions],
  );

  if (session?.role !== "student") return <Restricted />;

  const latest = measurements.at(-1);
  const first = measurements[0];

  function save() {
    const numericWeight = Number(weight.replace(",", "."));
    if (!Number.isFinite(numericWeight) || numericWeight < 25 || numericWeight > 350) {
      setError("Informe um peso entre 25 e 350 kg.");
      return;
    }
    const result = addBodyMeasurement({
      weightKg: numericWeight,
      bodyFatPercentage: fat ? Number(fat.replace(",", ".")) : null,
      waistCm: waist ? Number(waist.replace(",", ".")) : null
    });
    if (result.ok) {
      setModalOpen(false);
      setWeight("");
      setFat("");
      setWaist("");
      setError(undefined);
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Evolução física"
        title="Tendências, não julgamentos"
        description="Compare períodos e use cada medida como um sinal de contexto, nunca como diagnóstico."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={17} />
            <span>Nova medida</span>
          </Button>
        }
      />
      <div className="health-notice">
        <Info size={19} />
        <span>
          <strong>Informação de apoio.</strong> Medidas e IMC isolados não definem saúde. A Ativelo
          não substitui avaliação médica ou acompanhamento profissional habilitado.
        </span>
      </div>
      <div className="metrics-row">
        <article className="metric-tile">
          <span>Peso atual</span>
          <strong>
            {latest?.weightKg.toLocaleString("pt-BR") ?? "—"}
            <small>kg</small>
          </strong>
          {latest && first && (
            <div className="metric-tile__delta">
              <ArrowDown size={13} /> {(first.weightKg - latest.weightKg).toLocaleString("pt-BR")} kg
              no período
            </div>
          )}
        </article>
        <article className="metric-tile">
          <span>Percentual de gordura</span>
          <strong>
            {latest?.bodyFatPercentage?.toLocaleString("pt-BR") ?? "—"}
            <small>%</small>
          </strong>
          <div className="metric-tile__delta">Registro opcional e sensível</div>
        </article>
        <article className="metric-tile">
          <span>Cintura</span>
          <strong>
            {latest?.waistCm?.toLocaleString("pt-BR") ?? "—"}
            <small>cm</small>
          </strong>
          <div className="metric-tile__delta">Comparação contextual</div>
        </article>
      </div>
      <div className="measurement-layout">
        <div className="dashboard-stack">
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Evolução de peso</h2>
                <p>{measurements.length} registros no período selecionado.</p>
              </div>
              <span className="badge badge--brand">Todo o período</span>
            </header>
            <div className="panel__body">
              <div className="chart-wrap">
                <SimpleBarChart
                  items={chartData}
                  valueKey="peso"
                  labelKey="date"
                  unit="kg"
                  ariaLabel={`Peso variou de ${first?.weightKg ?? 0} para ${latest?.weightKg ?? 0} quilogramas.`}
                />
              </div>
            </div>
          </section>
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Volume por treino</h2>
                <p>Soma de repetições × carga registrada.</p>
              </div>
            </header>
            <div className="panel__body">
              <div className="chart-wrap">
                <SimpleBarChart
                  items={volumeBySession}
                  valueKey="volume"
                  labelKey="date"
                  unit="kg"
                  ariaLabel="Volume de treino por sessão."
                />
              </div>
            </div>
          </section>
        </div>
        <aside className="dashboard-stack">
          <article className="goal-card">
            <div className="goal-card__top">
              <div>
                <h3>Frequência semanal</h3>
                <p>Meta acolhedora: 3 sessões</p>
              </div>
              <span className="badge badge--success">
                {metrics.student?.weeklyFrequency ?? 0}/3
              </span>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min(100, ((metrics.student?.weeklyFrequency ?? 0) / 3) * 100)}%`
                }}
              />
            </div>
          </article>
          <article className="goal-card">
            <div className="goal-card__top">
              <div>
                <h3>Consistência mensal</h3>
                <p>Avançar sem perfeccionismo</p>
              </div>
              <span className="badge badge--brand">Em curso</span>
            </div>
            <div className="progress-track">
              <span style={{ width: "64%" }} />
            </div>
          </article>
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Registros</h2>
                <p>Histórico de medidas</p>
              </div>
            </header>
            <div className="panel__body" style={{ paddingInline: 8 }}>
              <table className="measurement-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Peso</th>
                    <th>Cintura</th>
                  </tr>
                </thead>
                <tbody>
                  {[...measurements].reverse().map((item) => (
                    <tr key={item.id}>
                      <td>{dateLabel(item.measuredAt)}</td>
                      <td>{item.weightKg.toLocaleString("pt-BR")} kg</td>
                      <td>
                        {item.waistCm ? `${item.waistCm.toLocaleString("pt-BR")} cm` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
      {modalOpen && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="measure-title">
            <header className="modal__header">
              <div>
                <h2 id="measure-title">Adicionar medida</h2>
                <p>Você controla quais informações opcionais deseja registrar.</p>
              </div>
              <button
                className="modal__close"
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </header>
            <div className="modal__body">
              <div className="measurement-form">
                {error && (
                  <div className="auth-error" role="alert">
                    <Info size={17} /> {error}
                  </div>
                )}
                <div className="measurement-form__grid">
                  <Field
                    label="Peso (kg)"
                    inputMode="decimal"
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    placeholder="68,5"
                  />
                  <Field
                    label="Gordura corporal (%) · opcional"
                    inputMode="decimal"
                    value={fat}
                    onChange={(event) => setFat(event.target.value)}
                    placeholder="25,8"
                  />
                  <Field
                    label="Cintura (cm) · opcional"
                    inputMode="decimal"
                    value={waist}
                    onChange={(event) => setWaist(event.target.value)}
                    placeholder="75,5"
                  />
                  <Field
                    label="Data"
                    type="date"
                    value={new Date().toISOString().slice(0, 10)}
                    readOnly
                  />
                </div>
              </div>
            </div>
            <footer className="modal__footer">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save}>Salvar medida</Button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function Restricted() {
  return (
    <div className="access-denied">
      <div>
        <span className="access-denied__icon">
          <Info size={30} />
        </span>
        <h1>Conteúdo protegido</h1>
        <p>
          Esta tela contém dados pessoais e está disponível somente ao próprio aluno neste fluxo.
        </p>
      </div>
    </div>
  );
}
