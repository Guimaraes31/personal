import { describe, expect, it } from "vitest";

import {
  DEMO_DATA,
  DEMO_NOW,
  DEMO_ORGANIZATION_IDS,
  DEMO_USER_IDS,
} from "./demo-data";
import {
  calculateOrganizationMetrics,
  calculateSaasMetrics,
  calculateStudentMetrics,
} from "./metrics";

describe("métricas derivadas", () => {
  it("calcula a evolução do aluno somente com seus registros", () => {
    const metrics = calculateStudentMetrics(
      DEMO_USER_IDS.student,
      DEMO_DATA.workoutSessions,
      DEMO_DATA.bodyMeasurements,
      DEMO_NOW,
    );

    expect(metrics.completedWorkouts).toBe(2);
    expect(metrics.weeklyFrequency).toBe(2);
    expect(metrics.latestWeightKg).toBe(68.5);
    expect(metrics.weightDeltaKg).toBe(-1.5);
    expect(metrics.totalVolume).toBeGreaterThan(0);
  });

  it("não mistura dados das organizações nos indicadores operacionais", () => {
    const primary = calculateOrganizationMetrics(
      DEMO_DATA,
      DEMO_ORGANIZATION_IDS.primary,
      DEMO_NOW,
    );
    const secondary = calculateOrganizationMetrics(
      DEMO_DATA,
      DEMO_ORGANIZATION_IDS.secondary,
      DEMO_NOW,
    );

    expect(primary).toMatchObject({
      students: 2,
      professionals: 1,
      completedWorkoutsLast30Days: 2,
      confirmedBookings: 1,
      waitlistedBookings: 1,
    });
    expect(secondary).toMatchObject({
      students: 1,
      professionals: 1,
      completedWorkoutsLast30Days: 1,
      confirmedBookings: 1,
      waitlistedBookings: 0,
    });
  });

  it("gera métricas SaaS apenas com metadados de organizações e planos", () => {
    expect(calculateSaasMetrics(DEMO_DATA)).toEqual({
      organizations: 2,
      activeOrganizations: 1,
      trials: 1,
      suspendedOrganizations: 0,
      subscriptionsByPlan: {
        professional: 1,
        essential: 1,
      },
    });
  });
});
