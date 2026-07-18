import { describe, expect, it } from "vitest";

import { DEMO_DATA } from "./demo-data";
import {
  calculateSessionVolume,
  completeWorkoutSession,
  recordExerciseSet,
  startWorkoutSession,
} from "./workouts";

describe("execução de treino", () => {
  it("cria séries determinísticas a partir da prescrição", () => {
    const plan = DEMO_DATA.workoutPlans[0];
    expect(plan).toBeDefined();

    const session = startWorkoutSession(plan!, {
      sessionId: "session-test",
      now: "2026-07-17T10:00:00.000Z",
    });

    expect(session.sets).toHaveLength(4);
    expect(session.sets[0]?.id).toBe("session-test:prescription-squat:1");
    expect(session.status).toBe("in_progress");
  });

  it("registra séries sem alterar a sessão recebida", () => {
    const plan = DEMO_DATA.workoutPlans[0]!;
    const original = startWorkoutSession(plan, {
      sessionId: "session-test",
      now: "2026-07-17T10:00:00.000Z",
    });
    const firstSet = original.sets[0]!;
    const updated = recordExerciseSet(original, {
      setId: firstSet.id,
      repetitions: 8,
      load: 32,
      now: "2026-07-17T10:03:00.000Z",
    });

    expect(original.sets[0]?.status).toBe("pending");
    expect(updated.sets[0]).toMatchObject({
      status: "completed",
      repetitions: 8,
      load: 32,
    });
  });

  it("só conclui após tratar todas as séries e calcula volume", () => {
    const plan = DEMO_DATA.workoutPlans[0]!;
    let session = startWorkoutSession(plan, {
      sessionId: "session-test",
      now: "2026-07-17T10:00:00.000Z",
    });

    expect(() =>
      completeWorkoutSession(session, {
        perceivedEffort: 7,
        feedback: "Tudo certo",
        now: "2026-07-17T10:40:00.000Z",
      }),
    ).toThrowError(expect.objectContaining({ code: "INCOMPLETE_SESSION" }));

    for (const set of session.sets) {
      session = recordExerciseSet(session, {
        setId: set.id,
        repetitions: set.targetRepetitions,
        load: 10,
        now: "2026-07-17T10:30:00.000Z",
      });
    }

    const completed = completeWorkoutSession(session, {
      perceivedEffort: 7,
      feedback: "Tudo certo",
      now: "2026-07-17T10:40:00.000Z",
    });

    expect(completed.status).toBe("completed");
    expect(calculateSessionVolume(completed)).toBe(360);
  });

  it("valida carga negativa antes de alterar o domínio", () => {
    const session = startWorkoutSession(DEMO_DATA.workoutPlans[0]!, {
      sessionId: "session-test",
      now: "2026-07-17T10:00:00.000Z",
    });

    expect(() =>
      recordExerciseSet(session, {
        setId: session.sets[0]!.id,
        repetitions: 8,
        load: -1,
        now: "2026-07-17T10:03:00.000Z",
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
  });
});
