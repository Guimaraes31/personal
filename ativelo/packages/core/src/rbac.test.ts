import { describe, expect, it } from "vitest";

import {
  DEMO_DATA,
  DEMO_ORGANIZATION_IDS,
  DEMO_USER_IDS,
} from "./demo-data";
import {
  canAccessTenantRecord,
  createActor,
  hasPermission,
} from "./rbac";

describe("RBAC e isolamento multiempresa", () => {
  it("representa os quatro papéis do produto nos dados demo", () => {
    const roles = new Set([
      ...DEMO_DATA.memberships.map((membership) => membership.role),
      ...DEMO_DATA.users
        .map((user) => user.platformRole)
        .filter((role): role is "saas_admin" => role !== null),
    ]);

    expect(roles).toEqual(
      new Set(["student", "professional", "organization_admin", "saas_admin"]),
    );
    expect(DEMO_DATA.organizations).toHaveLength(2);
  });

  it("nega acesso de um aluno aos dados de outra organização", () => {
    const actor = createActor(DEMO_DATA, DEMO_USER_IDS.student);

    expect(
      canAccessTenantRecord(actor, {
        organizationId: DEMO_ORGANIZATION_IDS.secondary,
        permission: "health:read_self",
        sensitivity: "health",
        ownerUserId: DEMO_USER_IDS.student,
      }),
    ).toBe(false);
  });

  it("permite ao aluno somente seus próprios dados dentro da organização", () => {
    const actor = createActor(DEMO_DATA, DEMO_USER_IDS.student);
    const baseRecord = {
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      permission: "health:read_self" as const,
      sensitivity: "health" as const,
    };

    expect(
      canAccessTenantRecord(actor, {
        ...baseRecord,
        ownerUserId: DEMO_USER_IDS.student,
      }),
    ).toBe(true);
    expect(
      canAccessTenantRecord(actor, {
        ...baseRecord,
        ownerUserId: DEMO_USER_IDS.secondStudent,
      }),
    ).toBe(false);
    expect(
      canAccessTenantRecord(actor, {
        ...baseRecord,
        ownerUserId: null,
      }),
    ).toBe(false);
  });

  it("limita o administrador SaaS a metadados, sem conceder saúde", () => {
    const actor = createActor(DEMO_DATA, DEMO_USER_IDS.saasAdmin);

    expect(
      canAccessTenantRecord(actor, {
        organizationId: DEMO_ORGANIZATION_IDS.primary,
        permission: "platform:read",
        sensitivity: "organization_metadata",
        ownerUserId: null,
      }),
    ).toBe(true);
    expect(
      canAccessTenantRecord(actor, {
        organizationId: DEMO_ORGANIZATION_IDS.primary,
        permission: "health:read_students",
        sensitivity: "health",
        ownerUserId: DEMO_USER_IDS.student,
      }),
    ).toBe(false);
    expect(hasPermission("organization_admin", "health:read_students")).toBe(false);
  });

  it("não deixa um administrador de academia contornar a proteção de saúde", () => {
    const actor = createActor(DEMO_DATA, DEMO_USER_IDS.organizationAdmin);

    expect(
      canAccessTenantRecord(actor, {
        organizationId: DEMO_ORGANIZATION_IDS.primary,
        permission: "billing:read",
        sensitivity: "health",
        ownerUserId: DEMO_USER_IDS.student,
      }),
    ).toBe(false);
  });
});
