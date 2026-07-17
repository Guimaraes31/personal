"use client";

import {
  DEMO_NOW,
  DomainRuleError,
  assertTenantRecordAccess,
  bodyMeasurementSchema,
  calculateOrganizationMetrics,
  calculateSaasMetrics,
  calculateStudentMetrics,
  cancelClassBooking as cancelDomainClassBooking,
  classSessionSchema,
  completeWorkoutSession as completeDomainWorkoutSession,
  createActor,
  createDemoData,
  getClassAvailability as getDomainClassAvailability,
  organizationSchema,
  recordExerciseSet as recordDomainExerciseSet,
  reserveClass as reserveDomainClass,
  skipExerciseSet as skipDomainExerciseSet,
  startWorkoutSession as startDomainWorkoutSession,
  subscriptionSchema,
  workoutPlanSchema,
  type Actor,
  type BodyMeasurement,
  type ClassBooking,
  type ClassSession,
  type DemoData,
  type Organization,
  type OrganizationMetrics,
  type OrganizationStatus,
  type PlanCode,
  type StudentMetrics,
  type Subscription,
  type SubscriptionStatus,
  type WorkoutExercisePrescription,
  type WorkoutPlan,
  type WorkoutSession,
} from "@ativelo/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  readDemoSession,
  writeDemoSession,
  type AppRole,
  type DemoSession,
} from "@/lib/auth/session";

const STORE_KEY = "ativelo:demo-store:v2";
const STORE_VERSION = 2;
const DEMO_MODE_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

// Este store sustenta apenas a demo local. Em produção, autorização e isolamento
// devem continuar sendo aplicados no servidor e por políticas RLS no banco.

type StoreSuccess<T> = { ok: true; value: T };
type StoreFailure = { ok: false; error: string };
export type DemoStoreResult<T> = StoreSuccess<T> | StoreFailure;

export interface DemoStoreMetrics {
  student: StudentMetrics | null;
  organization: OrganizationMetrics | null;
  saas: ReturnType<typeof calculateSaasMetrics> | null;
}

export interface CreateWorkoutPlanInput {
  id?: string;
  studentId: string;
  name: string;
  objective: string;
  scheduledWeekdays: number[];
  exercises: WorkoutExercisePrescription[];
  active?: boolean;
  now?: string;
}

export interface StartWorkoutInput {
  workoutPlanId: string;
  sessionId?: string;
  now?: string;
}

export interface RecordWorkoutSetInput {
  sessionId: string;
  setId: string;
  repetitions: number;
  load: number;
  now?: string;
}

export interface SkipWorkoutSetInput {
  sessionId: string;
  setId: string;
  now?: string;
}

export interface CompleteWorkoutInput {
  sessionId: string;
  perceivedEffort: number;
  feedback: string;
  now?: string;
}

export interface AddBodyMeasurementInput {
  id?: string;
  studentId?: string;
  measuredAt?: string;
  weightKg: number;
  bodyFatPercentage?: number | null;
  waistCm?: number | null;
}

export interface CreateClassSessionInput {
  id?: string;
  title: string;
  professionalId?: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  waitlistEnabled: boolean;
}

export interface ReserveClassInput {
  classSessionId: string;
  bookingId?: string;
  now?: string;
}

export interface CancelClassBookingInput {
  bookingId: string;
  now?: string;
}

export interface UpdateOrganizationInput {
  organizationId: string;
  name?: string;
  status?: OrganizationStatus;
}

export interface UpdateSubscriptionInput {
  organizationId: string;
  planCode?: PlanCode;
  status?: SubscriptionStatus;
  studentLimit?: number;
  professionalLimit?: number;
  unitLimit?: number;
  trialEndsAt?: string | null;
}

export interface DemoStoreValue {
  data: DemoData;
  session: DemoSession | null;
  isHydrated: boolean;
  error: string | null;
  message: string | null;
  metrics: DemoStoreMetrics;
  hydrate: () => void;
  reset: () => void;
  clearFeedback: () => void;
  createWorkoutPlan: (
    input: CreateWorkoutPlanInput,
  ) => DemoStoreResult<WorkoutPlan>;
  startWorkoutSession: (
    input: StartWorkoutInput,
  ) => DemoStoreResult<WorkoutSession>;
  recordWorkoutSet: (
    input: RecordWorkoutSetInput,
  ) => DemoStoreResult<WorkoutSession>;
  skipWorkoutSet: (
    input: SkipWorkoutSetInput,
  ) => DemoStoreResult<WorkoutSession>;
  completeWorkoutSession: (
    input: CompleteWorkoutInput,
  ) => DemoStoreResult<WorkoutSession>;
  addBodyMeasurement: (
    input: AddBodyMeasurementInput,
  ) => DemoStoreResult<BodyMeasurement>;
  createClassSession: (
    input: CreateClassSessionInput,
  ) => DemoStoreResult<ClassSession>;
  reserveClass: (input: ReserveClassInput) => DemoStoreResult<ClassBooking>;
  cancelClassBooking: (
    input: CancelClassBookingInput,
  ) => DemoStoreResult<ClassBooking>;
  updateOrganization: (
    input: UpdateOrganizationInput,
  ) => DemoStoreResult<Organization>;
  updateSubscription: (
    input: UpdateSubscriptionInput,
  ) => DemoStoreResult<Subscription>;
  getClassAvailability: (
    classSessionId: string,
  ) => { confirmed: number; waitlisted: number; availableSpots: number } | null;
  getStudentMetrics: (studentId?: string) => StudentMetrics | null;
}

interface MutationOutcome<T> {
  data: DemoData;
  value: T;
  message: string;
}

interface AuthorizedSession {
  session: DemoSession;
  actor: Actor;
  organizationId: string | null;
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

function emptyData(): DemoData {
  return {
    organizations: [],
    users: [],
    memberships: [],
    exercises: [],
    workoutPlans: [],
    workoutSessions: [],
    bodyMeasurements: [],
    classSessions: [],
    classBookings: [],
    subscriptions: [],
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function metricsReferenceDate(): string {
  return new Date(Math.max(Date.now(), Date.parse(DEMO_NOW))).toISOString();
}

let fallbackId = 0;
function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  fallbackId += 1;
  return `${prefix}-${Date.now()}-${fallbackId}`;
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Formato de armazenamento inválido.");
  }
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`Coleção ausente: ${key}`);
  }
  return value;
}

function parsePersistedData(serialized: string): DemoData {
  const envelope: unknown = JSON.parse(serialized);
  assertRecord(envelope);
  if (envelope.version !== STORE_VERSION) {
    throw new Error("Versão de armazenamento incompatível.");
  }

  const rawData = envelope.data;
  assertRecord(rawData);

  // Fast path: trust shape after version check; integrity is still asserted.
  // Full Zod re-parse on every hydrate was a major source of demo lag.
  const data: DemoData = {
    organizations: readArray(rawData, "organizations") as DemoData["organizations"],
    users: readArray(rawData, "users") as DemoData["users"],
    memberships: readArray(rawData, "memberships") as DemoData["memberships"],
    exercises: readArray(rawData, "exercises") as DemoData["exercises"],
    workoutPlans: readArray(rawData, "workoutPlans") as DemoData["workoutPlans"],
    workoutSessions: readArray(rawData, "workoutSessions") as DemoData["workoutSessions"],
    bodyMeasurements: readArray(rawData, "bodyMeasurements") as DemoData["bodyMeasurements"],
    classSessions: readArray(rawData, "classSessions") as DemoData["classSessions"],
    classBookings: readArray(rawData, "classBookings") as DemoData["classBookings"],
    subscriptions: readArray(rawData, "subscriptions") as DemoData["subscriptions"],
  };

  assertRelationalIntegrity(data);
  return data;
}

function assertRelationalIntegrity(data: DemoData): void {
  const assertUnique = (values: readonly string[], label: string) => {
    if (new Set(values).size !== values.length) {
      throw new Error(`Identificador duplicado em ${label}.`);
    }
  };

  const collections: ReadonlyArray<readonly [string, ReadonlyArray<{ id: string }>]> = [
    ["organizações", data.organizations],
    ["usuários", data.users],
    ["vínculos", data.memberships],
    ["exercícios", data.exercises],
    ["planos", data.workoutPlans],
    ["sessões", data.workoutSessions],
    ["medidas", data.bodyMeasurements],
    ["aulas", data.classSessions],
    ["reservas", data.classBookings],
    ["assinaturas", data.subscriptions],
  ];
  for (const [label, collection] of collections) {
    assertUnique(
      collection.map((item) => item.id),
      label,
    );
  }
  assertUnique(
    data.subscriptions.map((item) => item.organizationId),
    "organizações de assinaturas",
  );

  const organizationIds = new Set(data.organizations.map((item) => item.id));
  const userIds = new Set(data.users.map((item) => item.id));

  for (const membership of data.memberships) {
    if (
      !organizationIds.has(membership.organizationId) ||
      !userIds.has(membership.userId)
    ) {
      throw new Error("Vínculo de organização inválido.");
    }
  }

  for (const plan of data.workoutPlans) {
    assertUnique(
      plan.exercises.map((item) => item.id),
      `exercícios do plano ${plan.id}`,
    );
    if (
      !hasMembership(data, plan.organizationId, plan.studentId, "student") ||
      !hasMembership(data, plan.organizationId, plan.professionalId, "professional")
    ) {
      throw new Error("Plano de treino com vínculo inválido.");
    }
    for (const prescription of plan.exercises) {
      const exercise = data.exercises.find((item) => item.id === prescription.exerciseId);
      if (
        !exercise ||
        (exercise.organizationId !== null && exercise.organizationId !== plan.organizationId)
      ) {
        throw new Error("Plano de treino com exercício inválido.");
      }
    }
  }

  for (const workoutSession of data.workoutSessions) {
    assertUnique(
      workoutSession.sets.map((item) => item.id),
      `séries da sessão ${workoutSession.id}`,
    );
    const plan = data.workoutPlans.find((item) => item.id === workoutSession.workoutPlanId);
    if (
      !plan ||
      plan.organizationId !== workoutSession.organizationId ||
      plan.studentId !== workoutSession.studentId
    ) {
      throw new Error("Sessão de treino com vínculo inválido.");
    }
  }

  for (const measurement of data.bodyMeasurements) {
    if (
      !hasMembership(
        data,
        measurement.organizationId,
        measurement.studentId,
        "student",
      )
    ) {
      throw new Error("Medida corporal com vínculo inválido.");
    }
  }

  for (const classSession of data.classSessions) {
    if (
      !hasMembership(
        data,
        classSession.organizationId,
        classSession.professionalId,
        "professional",
      )
    ) {
      throw new Error("Aula com professor inválido.");
    }
  }

  for (const booking of data.classBookings) {
    const classSession = data.classSessions.find(
      (item) => item.id === booking.classSessionId,
    );
    if (
      !classSession ||
      classSession.organizationId !== booking.organizationId ||
      !hasMembership(data, booking.organizationId, booking.studentId, "student")
    ) {
      throw new Error("Reserva com vínculo inválido.");
    }
  }

  for (const subscription of data.subscriptions) {
    if (!organizationIds.has(subscription.organizationId)) {
      throw new Error("Assinatura com organização inválida.");
    }
  }
}

function serializeData(data: DemoData): string {
  return JSON.stringify({ version: STORE_VERSION, data });
}

function friendlyError(error: unknown): string {
  if (error instanceof DomainRuleError) {
    const messages: Partial<Record<DomainRuleError["code"], string>> = {
      INVALID_INPUT: "Revise os dados informados e tente novamente.",
      FORBIDDEN: "Você não tem permissão para realizar esta ação.",
      ORGANIZATION_MISMATCH: "Este item pertence a outra organização.",
      NOT_FOUND: "Não encontramos o item solicitado.",
      ALREADY_BOOKED: "Você já possui uma reserva ativa nesta aula.",
      CLASS_FULL: "A aula está lotada e não possui lista de espera.",
      CLASS_UNAVAILABLE: "Esta aula não está mais disponível para alterações.",
      BOOKING_NOT_CANCELLABLE: "Esta reserva não pode mais ser cancelada.",
      SESSION_NOT_ACTIVE: "Não foi possível alterar esta sessão de treino.",
      SET_NOT_FOUND: "Não encontramos esta série no treino.",
      INCOMPLETE_SESSION: "Conclua ou pule todas as séries antes de finalizar.",
    };
    return messages[error.code] ?? error.message;
  }

  if (error instanceof Error && error.name === "ZodError") {
    return "Revise os dados informados e tente novamente.";
  }

  return "Não foi possível concluir a ação. Tente novamente.";
}

function authorizeSession(
  data: DemoData,
  session: DemoSession | null,
  allowedRoles: readonly AppRole[],
): AuthorizedSession {
  if (!session) {
    throw new DomainRuleError("FORBIDDEN", "Entre para continuar.");
  }
  if (!allowedRoles.includes(session.role)) {
    throw new DomainRuleError("FORBIDDEN", "Papel sem permissão para esta ação.");
  }

  const actor = createActor(data, session.userId);
  if (session.role === "saas_admin") {
    if (actor.platformRole !== "saas_admin" || session.organizationId !== null) {
      throw new DomainRuleError("FORBIDDEN", "Sessão administrativa inválida.");
    }
    return { session, actor, organizationId: null };
  }

  if (!session.organizationId) {
    throw new DomainRuleError("FORBIDDEN", "Selecione uma organização para continuar.");
  }

  const membership = actor.memberships.find(
    (item) =>
      item.organizationId === session.organizationId &&
      item.active &&
      item.role === session.role,
  );
  if (!membership || !data.organizations.some((item) => item.id === session.organizationId)) {
    throw new DomainRuleError("FORBIDDEN", "Sessão sem vínculo ativo com a organização.");
  }

  return { session, actor, organizationId: session.organizationId };
}

function hasMembership(
  data: DemoData,
  organizationId: string,
  userId: string,
  role: AppRole,
): boolean {
  return data.memberships.some(
    (membership) =>
      membership.organizationId === organizationId &&
      membership.userId === userId &&
      membership.role === role &&
      membership.active,
  );
}

function visibleDataForSession(data: DemoData, session: DemoSession | null): DemoData {
  let authorized: AuthorizedSession;
  try {
    authorized = authorizeSession(data, session, [
      "student",
      "professional",
      "organization_admin",
      "saas_admin",
    ]);
  } catch {
    return emptyData();
  }

  if (authorized.session.role === "saas_admin") {
    return {
      ...emptyData(),
      organizations: data.organizations,
      users: data.users.filter((user) => user.id === authorized.session.userId),
      subscriptions: data.subscriptions,
    };
  }

  const organizationId = authorized.organizationId as string;
  const organizationMemberships = data.memberships.filter(
    (membership) => membership.organizationId === organizationId && membership.active,
  );
  const isStudent = authorized.session.role === "student";
  const isProfessional = authorized.session.role === "professional";
  const isOrganizationAdmin = authorized.session.role === "organization_admin";
  const visibleMemberships = isStudent
    ? organizationMemberships.filter(
        (membership) =>
          membership.userId === authorized.session.userId ||
          membership.role === "professional",
      )
    : organizationMemberships;
  const visibleUserIds = new Set(visibleMemberships.map((membership) => membership.userId));

  return {
    organizations: data.organizations.filter(
      (organization) => organization.id === organizationId,
    ),
    users: data.users.filter((user) => visibleUserIds.has(user.id)),
    memberships: visibleMemberships,
    exercises:
      isStudent || isProfessional
        ? data.exercises.filter(
            (exercise) =>
              exercise.organizationId === null || exercise.organizationId === organizationId,
          )
        : [],
    workoutPlans: isOrganizationAdmin
      ? []
      : data.workoutPlans.filter(
          (plan) =>
            plan.organizationId === organizationId &&
            (!isStudent || plan.studentId === authorized.session.userId),
        ),
    workoutSessions:
      isStudent || isProfessional
        ? data.workoutSessions.filter(
            (workoutSession) =>
              workoutSession.organizationId === organizationId &&
              (!isStudent || workoutSession.studentId === authorized.session.userId),
          )
        : [],
    bodyMeasurements:
      isStudent || isProfessional
        ? data.bodyMeasurements.filter(
            (measurement) =>
              measurement.organizationId === organizationId &&
              (!isStudent || measurement.studentId === authorized.session.userId),
          )
        : [],
    classSessions: data.classSessions.filter(
      (classSession) => classSession.organizationId === organizationId,
    ),
    classBookings: data.classBookings.filter(
      (booking) =>
        booking.organizationId === organizationId &&
        (!isStudent || booking.studentId === authorized.session.userId),
    ),
    subscriptions: isOrganizationAdmin
      ? data.subscriptions.filter(
          (subscription) => subscription.organizationId === organizationId,
        )
      : [],
  };
}

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [rawData, setRawData] = useState<DemoData>(() => createDemoData());
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const dataRef = useRef(rawData);
  const sessionRef = useRef<DemoSession | null>(null);

  const replaceData = useCallback((nextData: DemoData) => {
    dataRef.current = nextData;
    setRawData(nextData);
  }, []);

  const replaceSession = useCallback((nextSession: DemoSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const hydrate = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!DEMO_MODE_ENABLED) {
      replaceSession(null);
      replaceData(emptyData());
      setError("O modo demonstração está desativado neste ambiente.");
      setIsHydrated(true);
      return;
    }

    try {
      replaceSession(readDemoSession());
      const persisted = window.localStorage.getItem(STORE_KEY);
      if (!persisted) {
        replaceData(createDemoData());
        setError(null);
        setIsHydrated(true);
        return;
      }
      replaceData(parsePersistedData(persisted));
      setError(null);
    } catch {
      replaceData(createDemoData());
      setError(
        "O armazenamento local não estava disponível ou era inválido; a demo foi restaurada em memória.",
      );
    }
    setIsHydrated(true);
  }, [replaceData, replaceSession]);

  const reset = useCallback(() => {
    if (!DEMO_MODE_ENABLED) {
      replaceData(emptyData());
      setError("O modo demonstração está desativado neste ambiente.");
      setMessage(null);
      setIsHydrated(true);
      return;
    }
    const initialData = createDemoData();
    replaceData(initialData);
    setError(null);
    setMessage("Demonstração restaurada para o estado inicial.");
    setIsHydrated(true);
  }, [replaceData]);

  const clearFeedback = useCallback(() => {
    setError(null);
    setMessage(null);
  }, []);

  useEffect(() => {
    hydrate();

    const handleSessionChange = () =>
      replaceSession(DEMO_MODE_ENABLED ? readDemoSession() : null);
    const handleStorage = (event: StorageEvent) => {
      if (!DEMO_MODE_ENABLED) return;
      if (event.key === "ativelo:session") {
        handleSessionChange();
        return;
      }
      if (event.key !== STORE_KEY) return;

      if (!event.newValue) {
        replaceData(createDemoData());
        return;
      }
      try {
        replaceData(parsePersistedData(event.newValue));
        setError(null);
      } catch {
        setError("Não foi possível sincronizar os dados desta aba.");
      }
    };

    window.addEventListener("ativelo:session", handleSessionChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("ativelo:session", handleSessionChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [hydrate, replaceData, replaceSession]);

  useEffect(() => {
    if (!DEMO_MODE_ENABLED || !isHydrated || typeof window === "undefined") return;
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORE_KEY, serializeData(rawData));
      } catch {
        setError("As alterações funcionam nesta aba, mas não puderam ser salvas no navegador.");
      }
    }, 120);
    return () => window.clearTimeout(handle);
  }, [isHydrated, rawData]);

  const applyMutation = useCallback(
    <T,>(mutation: (current: DemoData) => MutationOutcome<T>): DemoStoreResult<T> => {
      try {
        const outcome = mutation(dataRef.current);
        replaceData(outcome.data);
        setError(null);
        setMessage(outcome.message);
        return { ok: true, value: outcome.value };
      } catch (mutationError) {
        const friendly = friendlyError(mutationError);
        setError(friendly);
        setMessage(null);
        return { ok: false, error: friendly };
      }
    },
    [replaceData],
  );

  const createWorkoutPlan = useCallback(
    (input: CreateWorkoutPlanInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["professional"]);
        const organizationId = authorized.organizationId as string;
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "workouts:manage",
          sensitivity: "operational",
          ownerUserId: input.studentId,
        });
        if (!hasMembership(current, organizationId, input.studentId, "student")) {
          throw new DomainRuleError("NOT_FOUND", "Aluno não encontrado nesta organização.");
        }

        const timestamp = input.now ?? nowIso();
        const plan: WorkoutPlan = workoutPlanSchema.parse({
          id: input.id ?? createLocalId("plan"),
          organizationId,
          studentId: input.studentId,
          professionalId: authorized.session.userId,
          name: input.name,
          objective: input.objective,
          scheduledWeekdays: [...input.scheduledWeekdays],
          version: 1,
          active: input.active ?? true,
          exercises: input.exercises.map((exercise) => ({ ...exercise })),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        if (current.workoutPlans.some((candidate) => candidate.id === plan.id)) {
          throw new DomainRuleError("INVALID_INPUT", "Identificador de treino duplicado.");
        }
        for (const prescription of plan.exercises) {
          const exercise = current.exercises.find(
            (candidate) => candidate.id === prescription.exerciseId && candidate.active,
          );
          if (
            !exercise ||
            (exercise.organizationId !== null && exercise.organizationId !== organizationId)
          ) {
            throw new DomainRuleError("NOT_FOUND", "Exercício indisponível nesta organização.");
          }
        }

        return {
          data: { ...current, workoutPlans: [...current.workoutPlans, plan] },
          value: plan,
          message: "Treino criado e prescrito com sucesso.",
        };
      }),
    [applyMutation],
  );

  const startWorkoutSession = useCallback(
    (input: StartWorkoutInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["student"]);
        const organizationId = authorized.organizationId as string;
        const plan = current.workoutPlans.find(
          (candidate) =>
            candidate.id === input.workoutPlanId &&
            candidate.organizationId === organizationId &&
            candidate.studentId === authorized.session.userId,
        );
        if (!plan) throw new DomainRuleError("NOT_FOUND", "Treino não encontrado.");
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "workouts:execute_self",
          sensitivity: "health",
          ownerUserId: authorized.session.userId,
        });
        const activeSession = current.workoutSessions.find(
          (candidate) =>
            candidate.organizationId === organizationId &&
            candidate.studentId === authorized.session.userId &&
            candidate.status === "in_progress",
        );
        if (activeSession?.workoutPlanId === plan.id) {
          return {
            data: current,
            value: activeSession,
            message: "Sessão em andamento recuperada.",
          };
        }
        if (activeSession) {
          throw new DomainRuleError(
            "SESSION_NOT_ACTIVE",
            "Finalize a sessão em andamento antes de iniciar outra.",
          );
        }

        const workoutSession = startDomainWorkoutSession(plan, {
          sessionId: input.sessionId ?? createLocalId("session"),
          now: input.now ?? nowIso(),
        });
        if (current.workoutSessions.some((candidate) => candidate.id === workoutSession.id)) {
          throw new DomainRuleError("INVALID_INPUT", "Identificador de sessão duplicado.");
        }

        return {
          data: {
            ...current,
            workoutSessions: [...current.workoutSessions, workoutSession],
          },
          value: workoutSession,
          message: "Treino iniciado. Seu progresso será salvo automaticamente.",
        };
      }),
    [applyMutation],
  );

  const recordWorkoutSet = useCallback(
    (input: RecordWorkoutSetInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["student"]);
        const organizationId = authorized.organizationId as string;
        const workoutSession = current.workoutSessions.find(
          (candidate) =>
            candidate.id === input.sessionId &&
            candidate.organizationId === organizationId &&
            candidate.studentId === authorized.session.userId,
        );
        if (!workoutSession) throw new DomainRuleError("NOT_FOUND", "Sessão não encontrada.");
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "workouts:execute_self",
          sensitivity: "health",
          ownerUserId: authorized.session.userId,
        });

        const updated = recordDomainExerciseSet(workoutSession, {
          setId: input.setId,
          repetitions: input.repetitions,
          load: input.load,
          now: input.now ?? nowIso(),
        });
        return {
          data: {
            ...current,
            workoutSessions: current.workoutSessions.map((candidate) =>
              candidate.id === updated.id ? updated : candidate,
            ),
          },
          value: updated,
          message: "Série registrada.",
        };
      }),
    [applyMutation],
  );

  const skipWorkoutSet = useCallback(
    (input: SkipWorkoutSetInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["student"]);
        const organizationId = authorized.organizationId as string;
        const workoutSession = current.workoutSessions.find(
          (candidate) =>
            candidate.id === input.sessionId &&
            candidate.organizationId === organizationId &&
            candidate.studentId === authorized.session.userId,
        );
        if (!workoutSession) throw new DomainRuleError("NOT_FOUND", "Sessão não encontrada.");
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "workouts:execute_self",
          sensitivity: "health",
          ownerUserId: authorized.session.userId,
        });

        const updated = skipDomainExerciseSet(workoutSession, {
          setId: input.setId,
          now: input.now ?? nowIso(),
        });
        return {
          data: {
            ...current,
            workoutSessions: current.workoutSessions.map((candidate) =>
              candidate.id === updated.id ? updated : candidate,
            ),
          },
          value: updated,
          message: "Série pulada. Você pode seguir para a próxima.",
        };
      }),
    [applyMutation],
  );

  const completeWorkoutSession = useCallback(
    (input: CompleteWorkoutInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["student"]);
        const organizationId = authorized.organizationId as string;
        const workoutSession = current.workoutSessions.find(
          (candidate) =>
            candidate.id === input.sessionId &&
            candidate.organizationId === organizationId &&
            candidate.studentId === authorized.session.userId,
        );
        if (!workoutSession) throw new DomainRuleError("NOT_FOUND", "Sessão não encontrada.");
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "workouts:execute_self",
          sensitivity: "health",
          ownerUserId: authorized.session.userId,
        });

        const completed = completeDomainWorkoutSession(workoutSession, {
          perceivedEffort: input.perceivedEffort,
          feedback: input.feedback,
          now: input.now ?? nowIso(),
        });
        return {
          data: {
            ...current,
            workoutSessions: current.workoutSessions.map((candidate) =>
              candidate.id === completed.id ? completed : candidate,
            ),
          },
          value: completed,
          message: "Treino concluído. Excelente trabalho no seu ritmo!",
        };
      }),
    [applyMutation],
  );

  const addBodyMeasurement = useCallback(
    (input: AddBodyMeasurementInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["student"]);
        const organizationId = authorized.organizationId as string;
        const studentId = authorized.session.userId;
        if (!studentId || !hasMembership(current, organizationId, studentId, "student")) {
          throw new DomainRuleError("NOT_FOUND", "Aluno não encontrado nesta organização.");
        }
        if (input.studentId && input.studentId !== authorized.session.userId) {
          throw new DomainRuleError("FORBIDDEN", "Alunos só podem registrar as próprias medidas.");
        }
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "health:update_self",
          sensitivity: "health",
          ownerUserId: studentId,
        });

        const measurement: BodyMeasurement = bodyMeasurementSchema.parse({
          id: input.id ?? createLocalId("measurement"),
          organizationId,
          studentId,
          measuredAt: input.measuredAt ?? nowIso(),
          weightKg: input.weightKg,
          bodyFatPercentage: input.bodyFatPercentage ?? null,
          waistCm: input.waistCm ?? null,
        });
        if (current.bodyMeasurements.some((candidate) => candidate.id === measurement.id)) {
          throw new DomainRuleError("INVALID_INPUT", "Identificador de medida duplicado.");
        }

        return {
          data: {
            ...current,
            bodyMeasurements: [...current.bodyMeasurements, measurement],
          },
          value: measurement,
          message: "Medida adicionada à sua evolução.",
        };
      }),
    [applyMutation],
  );

  const createClassSession = useCallback(
    (input: CreateClassSessionInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, [
          "professional",
          "organization_admin",
        ]);
        const organizationId = authorized.organizationId as string;
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "classes:manage",
          sensitivity: "operational",
          ownerUserId: null,
        });
        const professionalId =
          authorized.session.role === "professional"
            ? authorized.session.userId
            : input.professionalId;
        if (
          !professionalId ||
          !hasMembership(current, organizationId, professionalId, "professional")
        ) {
          throw new DomainRuleError("NOT_FOUND", "Professor não encontrado nesta organização.");
        }

        const classSession: ClassSession = classSessionSchema.parse({
          id: input.id ?? createLocalId("class"),
          organizationId,
          title: input.title,
          professionalId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          capacity: input.capacity,
          waitlistEnabled: input.waitlistEnabled,
          status: "scheduled",
        });
        if (current.classSessions.some((candidate) => candidate.id === classSession.id)) {
          throw new DomainRuleError("INVALID_INPUT", "Identificador de aula duplicado.");
        }

        return {
          data: { ...current, classSessions: [...current.classSessions, classSession] },
          value: classSession,
          message: "Aula criada e publicada na agenda.",
        };
      }),
    [applyMutation],
  );

  const reserveClass = useCallback(
    (input: ReserveClassInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["student"]);
        const organizationId = authorized.organizationId as string;
        const classSession = current.classSessions.find(
          (candidate) =>
            candidate.id === input.classSessionId &&
            candidate.organizationId === organizationId,
        );
        if (!classSession) throw new DomainRuleError("NOT_FOUND", "Aula não encontrada.");
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "classes:book_self",
          sensitivity: "operational",
          ownerUserId: authorized.session.userId,
        });

        const result = reserveDomainClass(classSession, current.classBookings, {
          bookingId: input.bookingId ?? createLocalId("booking"),
          organizationId,
          studentId: authorized.session.userId,
          now: input.now ?? nowIso(),
        });
        return {
          data: { ...current, classBookings: result.bookings },
          value: result.booking,
          message:
            result.booking.status === "confirmed"
              ? "Reserva confirmada. Até a aula!"
              : `Aula lotada. Você entrou na posição ${result.waitlistPosition ?? 1} da espera.`,
        };
      }),
    [applyMutation],
  );

  const cancelClassBooking = useCallback(
    (input: CancelClassBookingInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["student"]);
        const organizationId = authorized.organizationId as string;
        const booking = current.classBookings.find(
          (candidate) =>
            candidate.id === input.bookingId &&
            candidate.organizationId === organizationId &&
            candidate.studentId === authorized.session.userId,
        );
        if (!booking) throw new DomainRuleError("NOT_FOUND", "Reserva não encontrada.");
        const classSession = current.classSessions.find(
          (candidate) =>
            candidate.id === booking.classSessionId &&
            candidate.organizationId === organizationId,
        );
        if (!classSession) throw new DomainRuleError("NOT_FOUND", "Aula não encontrada.");
        assertTenantRecordAccess(authorized.actor, {
          organizationId,
          permission: "classes:book_self",
          sensitivity: "operational",
          ownerUserId: authorized.session.userId,
        });

        const result = cancelDomainClassBooking(classSession, current.classBookings, {
          bookingId: booking.id,
          organizationId,
          now: input.now ?? nowIso(),
        });
        return {
          data: { ...current, classBookings: result.bookings },
          value: result.cancelledBooking,
          message: "Reserva cancelada. A vaga foi liberada para outra pessoa.",
        };
      }),
    [applyMutation],
  );

  const updateOrganization = useCallback(
    (input: UpdateOrganizationInput) => {
      const result = applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, [
          "organization_admin",
          "saas_admin",
        ]);
        const organization = current.organizations.find(
          (candidate) => candidate.id === input.organizationId,
        );
        if (!organization) {
          throw new DomainRuleError("NOT_FOUND", "Organização não encontrada.");
        }

        if (authorized.session.role === "saas_admin") {
          assertTenantRecordAccess(authorized.actor, {
            organizationId: organization.id,
            permission: "platform:manage",
            sensitivity: "organization_metadata",
            ownerUserId: null,
          });
        } else {
          if (authorized.organizationId !== organization.id || input.status !== undefined) {
            throw new DomainRuleError(
              "FORBIDDEN",
              "A gestora pode editar somente os dados públicos da própria academia.",
            );
          }
          assertTenantRecordAccess(authorized.actor, {
            organizationId: organization.id,
            permission: "organization:update",
            sensitivity: "organization_metadata",
            ownerUserId: null,
          });
        }

        const updated = organizationSchema.parse({
          ...organization,
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.status === undefined ? {} : { status: input.status }),
        });
        return {
          data: {
            ...current,
            organizations: current.organizations.map((candidate) =>
              candidate.id === updated.id ? updated : candidate,
            ),
          },
          value: updated,
          message: "Dados da organização atualizados.",
        };
      });

      const currentSession = sessionRef.current;
      if (
        result.ok &&
        currentSession?.organizationId === result.value.id &&
        currentSession.organizationName !== result.value.name
      ) {
        const nextSession: DemoSession = {
          ...currentSession,
          organizationName: result.value.name,
        };
        replaceSession(nextSession);
        writeDemoSession(nextSession);
      }

      return result;
    },
    [applyMutation, replaceSession],
  );

  const updateSubscription = useCallback(
    (input: UpdateSubscriptionInput) =>
      applyMutation((current) => {
        const authorized = authorizeSession(current, sessionRef.current, ["saas_admin"]);
        const subscription = current.subscriptions.find(
          (candidate) => candidate.organizationId === input.organizationId,
        );
        if (!subscription) {
          throw new DomainRuleError("NOT_FOUND", "Assinatura não encontrada.");
        }
        assertTenantRecordAccess(authorized.actor, {
          organizationId: input.organizationId,
          permission: "platform:manage",
          sensitivity: "organization_metadata",
          ownerUserId: null,
        });

        const updated = subscriptionSchema.parse({
          ...subscription,
          ...(input.planCode === undefined ? {} : { planCode: input.planCode }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.studentLimit === undefined ? {} : { studentLimit: input.studentLimit }),
          ...(input.professionalLimit === undefined
            ? {}
            : { professionalLimit: input.professionalLimit }),
          ...(input.unitLimit === undefined ? {} : { unitLimit: input.unitLimit }),
          ...(input.trialEndsAt === undefined ? {} : { trialEndsAt: input.trialEndsAt }),
        });
        return {
          data: {
            ...current,
            subscriptions: current.subscriptions.map((candidate) =>
              candidate.id === updated.id ? updated : candidate,
            ),
          },
          value: updated,
          message: "Assinatura atualizada no modo demonstração.",
        };
      }),
    [applyMutation],
  );

  const getClassAvailability = useCallback((classSessionId: string) => {
    const current = dataRef.current;
    try {
      const authorized = authorizeSession(current, sessionRef.current, [
        "student",
        "professional",
        "organization_admin",
      ]);
      const classSession = current.classSessions.find(
        (candidate) =>
          candidate.id === classSessionId &&
          candidate.organizationId === authorized.organizationId,
      );
      return classSession
        ? getDomainClassAvailability(classSession, current.classBookings)
        : null;
    } catch {
      return null;
    }
  }, []);

  const getStudentMetrics = useCallback((studentId?: string) => {
    const current = dataRef.current;
    try {
      const authorized = authorizeSession(current, sessionRef.current, [
        "student",
        "professional",
      ]);
      const organizationId = authorized.organizationId as string;
      const targetStudentId =
        authorized.session.role === "student" ? authorized.session.userId : studentId;
      if (
        !targetStudentId ||
        !hasMembership(current, organizationId, targetStudentId, "student")
      ) {
        return null;
      }
      if (
        authorized.session.role === "student" &&
        studentId &&
        studentId !== authorized.session.userId
      ) {
        return null;
      }
      return calculateStudentMetrics(
        targetStudentId,
        current.workoutSessions.filter(
          (workoutSession) => workoutSession.organizationId === organizationId,
        ),
        current.bodyMeasurements.filter(
          (measurement) => measurement.organizationId === organizationId,
        ),
        metricsReferenceDate(),
      );
    } catch {
      return null;
    }
  }, []);

  const data = useMemo(() => visibleDataForSession(rawData, session), [rawData, session]);
  const metrics = useMemo<DemoStoreMetrics>(() => {
    try {
      const authorized = authorizeSession(rawData, session, [
        "student",
        "professional",
        "organization_admin",
        "saas_admin",
      ]);
      if (authorized.session.role === "saas_admin") {
        return {
          student: null,
          organization: null,
          saas: calculateSaasMetrics(rawData),
        };
      }
      const organizationId = authorized.organizationId as string;
      return {
        student:
          authorized.session.role === "student"
            ? calculateStudentMetrics(
                authorized.session.userId,
                rawData.workoutSessions.filter(
                  (workoutSession) => workoutSession.organizationId === organizationId,
                ),
                rawData.bodyMeasurements.filter(
                  (measurement) => measurement.organizationId === organizationId,
                ),
                metricsReferenceDate(),
              )
            : null,
        organization:
          authorized.session.role === "professional" ||
          authorized.session.role === "organization_admin"
            ? calculateOrganizationMetrics(rawData, organizationId, metricsReferenceDate())
            : null,
        saas: null,
      };
    } catch {
      return { student: null, organization: null, saas: null };
    }
  }, [rawData, session]);

  const value = useMemo<DemoStoreValue>(
    () => ({
      data,
      session,
      isHydrated,
      error,
      message,
      metrics,
      hydrate,
      reset,
      clearFeedback,
      createWorkoutPlan,
      startWorkoutSession,
      recordWorkoutSet,
      skipWorkoutSet,
      completeWorkoutSession,
      addBodyMeasurement,
      createClassSession,
      reserveClass,
      cancelClassBooking,
      updateOrganization,
      updateSubscription,
      getClassAvailability,
      getStudentMetrics,
    }),
    [
      addBodyMeasurement,
      cancelClassBooking,
      clearFeedback,
      completeWorkoutSession,
      createClassSession,
      createWorkoutPlan,
      data,
      error,
      getClassAvailability,
      getStudentMetrics,
      hydrate,
      isHydrated,
      message,
      metrics,
      recordWorkoutSet,
      reserveClass,
      reset,
      session,
      skipWorkoutSet,
      startWorkoutSession,
      updateOrganization,
      updateSubscription,
    ],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStoreValue {
  const context = useContext(DemoStoreContext);
  if (!context) {
    throw new Error("useDemoStore deve ser usado dentro de DemoStoreProvider.");
  }
  return context;
}
