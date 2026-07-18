import { DomainRuleError } from "./errors";
import {
  completeWorkoutSessionInputSchema,
  recordExerciseSetInputSchema,
  skipExerciseSetInputSchema,
  startWorkoutSessionInputSchema,
  workoutPlanSchema,
  workoutSessionSchema,
} from "./schemas";
import type { WorkoutPlan, WorkoutSession, WorkoutSetRecord } from "./types";
import { parseDomainInput } from "./validation";

function assertActiveSession(session: WorkoutSession): void {
  if (session.status !== "in_progress") {
    throw new DomainRuleError("SESSION_NOT_ACTIVE", "A sessão não está em andamento.");
  }
}

function assertValidSessionTimestamp(session: WorkoutSession, now: string): void {
  if (Date.parse(now) < Date.parse(session.startedAt)) {
    throw new DomainRuleError(
      "INVALID_INPUT",
      "O horário da atualização não pode ser anterior ao início da sessão.",
    );
  }
}

function updateSet(
  session: WorkoutSession,
  setId: string,
  updater: (set: WorkoutSetRecord) => WorkoutSetRecord,
  now: string,
): WorkoutSession {
  assertActiveSession(session);
  assertValidSessionTimestamp(session, now);

  const targetExists = session.sets.some((set) => set.id === setId);
  if (!targetExists) {
    throw new DomainRuleError("SET_NOT_FOUND", "Série não encontrada na sessão.");
  }

  return {
    ...session,
    updatedAt: now,
    sets: session.sets.map((set) => (set.id === setId ? updater(set) : set)),
  };
}

export function startWorkoutSession(
  workoutPlanInput: WorkoutPlan,
  rawInput: unknown,
): WorkoutSession {
  const workoutPlan = parseDomainInput(workoutPlanSchema, workoutPlanInput);
  const input = parseDomainInput(startWorkoutSessionInputSchema, rawInput);

  if (!workoutPlan.active) {
    throw new DomainRuleError("SESSION_NOT_ACTIVE", "Este plano de treino não está ativo.");
  }

  const sets = [...workoutPlan.exercises]
    .sort((left, right) => left.order - right.order)
    .flatMap((prescription) =>
      Array.from({ length: prescription.sets }, (_, index): WorkoutSetRecord => ({
        id: `${input.sessionId}:${prescription.id}:${index + 1}`,
        workoutExerciseId: prescription.id,
        exerciseId: prescription.exerciseId,
        setNumber: index + 1,
        targetRepetitions: prescription.repetitions,
        repetitions: null,
        load: null,
        loadUnit: prescription.loadUnit,
        status: "pending",
        completedAt: null,
      })),
    );

  return {
    id: input.sessionId,
    organizationId: workoutPlan.organizationId,
    workoutPlanId: workoutPlan.id,
    studentId: workoutPlan.studentId,
    status: "in_progress",
    startedAt: input.now,
    updatedAt: input.now,
    completedAt: null,
    perceivedEffort: null,
    feedback: "",
    sets,
  };
}

export function recordExerciseSet(
  sessionInput: WorkoutSession,
  rawInput: unknown,
): WorkoutSession {
  const session = parseDomainInput(workoutSessionSchema, sessionInput);
  const input = parseDomainInput(recordExerciseSetInputSchema, rawInput);

  return updateSet(
    session,
    input.setId,
    (set) => ({
      ...set,
      repetitions: input.repetitions,
      load: input.load,
      status: "completed",
      completedAt: input.now,
    }),
    input.now,
  );
}

export function skipExerciseSet(
  sessionInput: WorkoutSession,
  rawInput: unknown,
): WorkoutSession {
  const session = parseDomainInput(workoutSessionSchema, sessionInput);
  const input = parseDomainInput(skipExerciseSetInputSchema, rawInput);

  return updateSet(
    session,
    input.setId,
    (set) => ({
      ...set,
      repetitions: null,
      load: null,
      status: "skipped",
      completedAt: input.now,
    }),
    input.now,
  );
}

export function completeWorkoutSession(
  sessionInput: WorkoutSession,
  rawInput: unknown,
): WorkoutSession {
  const session = parseDomainInput(workoutSessionSchema, sessionInput);
  const input = parseDomainInput(completeWorkoutSessionInputSchema, rawInput);
  assertActiveSession(session);
  assertValidSessionTimestamp(session, input.now);

  if (session.sets.some((set) => set.status === "pending")) {
    throw new DomainRuleError(
      "INCOMPLETE_SESSION",
      "Conclua ou pule todas as séries antes de finalizar.",
    );
  }

  if (!session.sets.some((set) => set.status === "completed")) {
    throw new DomainRuleError(
      "INCOMPLETE_SESSION",
      "Registre ao menos uma série para concluir o treino.",
    );
  }

  return {
    ...session,
    status: "completed",
    updatedAt: input.now,
    completedAt: input.now,
    perceivedEffort: input.perceivedEffort,
    feedback: input.feedback,
  };
}

export function abandonWorkoutSession(sessionInput: WorkoutSession, now: string): WorkoutSession {
  const session = parseDomainInput(workoutSessionSchema, sessionInput);
  const parsedNow = parseDomainInput(startWorkoutSessionInputSchema, {
    sessionId: session.id,
    now,
  }).now;
  assertActiveSession(session);
  assertValidSessionTimestamp(session, parsedNow);

  return {
    ...session,
    status: "abandoned",
    updatedAt: parsedNow,
    completedAt: parsedNow,
  };
}

export function calculateSessionVolume(session: WorkoutSession): number {
  return session.sets.reduce((total, set) => {
    if (set.status !== "completed" || set.repetitions === null || set.load === null) {
      return total;
    }
    return total + set.repetitions * set.load;
  }, 0);
}

export function calculateSessionDurationMinutes(session: WorkoutSession): number | null {
  if (!session.completedAt) {
    return null;
  }

  return Math.max(
    0,
    Math.round((Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 60_000),
  );
}
