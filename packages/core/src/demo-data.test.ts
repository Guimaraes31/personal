import { describe, expect, it } from "vitest";

import { DEMO_DATA, createDemoData } from "./demo-data";
import {
  bodyMeasurementSchema,
  classBookingSchema,
  classSessionSchema,
  organizationMembershipSchema,
  organizationSchema,
  subscriptionSchema,
  userSchema,
  workoutPlanSchema,
  workoutSessionSchema,
} from "./schemas";

describe("dados de demonstração", () => {
  it("mantém todas as entidades em formatos válidos", () => {
    expect(() => {
      DEMO_DATA.organizations.forEach((item) => organizationSchema.parse(item));
      DEMO_DATA.users.forEach((item) => userSchema.parse(item));
      DEMO_DATA.memberships.forEach((item) => organizationMembershipSchema.parse(item));
      DEMO_DATA.workoutPlans.forEach((item) => workoutPlanSchema.parse(item));
      DEMO_DATA.workoutSessions.forEach((item) => workoutSessionSchema.parse(item));
      DEMO_DATA.bodyMeasurements.forEach((item) => bodyMeasurementSchema.parse(item));
      DEMO_DATA.classSessions.forEach((item) => classSessionSchema.parse(item));
      DEMO_DATA.classBookings.forEach((item) => classBookingSchema.parse(item));
      DEMO_DATA.subscriptions.forEach((item) => subscriptionSchema.parse(item));
    }).not.toThrow();
  });

  it("entrega uma cópia independente para cada reinicialização da demo", () => {
    const first = createDemoData();
    const second = createDemoData();
    first.organizations[0]!.name = "Nome alterado localmente";

    expect(second.organizations[0]!.name).toBe("Academia Horizonte");
    expect(DEMO_DATA.organizations[0]!.name).toBe("Academia Horizonte");
  });
});
