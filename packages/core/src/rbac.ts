import { DomainRuleError } from "./errors";
import type {
  Actor,
  DemoData,
  OrganizationMembership,
  OrganizationRole,
  Role,
} from "./types";

export const PERMISSIONS = [
  "profile:read_self",
  "profile:update_self",
  "organization:read",
  "organization:update",
  "members:read",
  "members:manage",
  "students:read",
  "students:manage",
  "workouts:read_self",
  "workouts:execute_self",
  "workouts:manage",
  "workouts:assign",
  "sessions:read_self",
  "sessions:read_students",
  "health:read_self",
  "health:update_self",
  "health:read_students",
  "classes:read",
  "classes:book_self",
  "classes:manage",
  "platform:read",
  "platform:manage",
  "billing:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type DataSensitivity = "organization_metadata" | "operational" | "health";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  student: [
    "profile:read_self",
    "profile:update_self",
    "workouts:read_self",
    "workouts:execute_self",
    "sessions:read_self",
    "health:read_self",
    "health:update_self",
    "classes:read",
    "classes:book_self",
  ],
  professional: [
    "profile:read_self",
    "profile:update_self",
    "organization:read",
    "students:read",
    "workouts:manage",
    "workouts:assign",
    "sessions:read_students",
    "health:read_students",
    "classes:read",
    "classes:manage",
  ],
  organization_admin: [
    "profile:read_self",
    "profile:update_self",
    "organization:read",
    "organization:update",
    "members:read",
    "members:manage",
    "students:read",
    "students:manage",
    "classes:read",
    "classes:manage",
    "billing:read",
  ],
  saas_admin: ["platform:read", "platform:manage", "billing:read"],
};

const STUDENT_SELF_PERMISSIONS: readonly Permission[] = [
  "profile:read_self",
  "profile:update_self",
  "workouts:read_self",
  "workouts:execute_self",
  "sessions:read_self",
  "health:read_self",
  "health:update_self",
  "classes:book_self",
];

export interface TenantRecordAccess {
  organizationId: string;
  permission: Permission;
  sensitivity: DataSensitivity;
  ownerUserId: string | null;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const can = hasPermission;

export function createActor(data: Pick<DemoData, "users" | "memberships">, userId: string): Actor {
  const user = data.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new DomainRuleError("NOT_FOUND", "Usuário não encontrado.");
  }

  return {
    userId: user.id,
    platformRole: user.platformRole,
    memberships: data.memberships.filter(
      (membership) => membership.userId === user.id && membership.active,
    ),
  };
}

export function getOrganizationMembership(
  actor: Actor,
  organizationId: string,
): OrganizationMembership | null {
  return (
    actor.memberships.find(
      (membership) =>
        membership.organizationId === organizationId && membership.active,
    ) ?? null
  );
}

export function getOrganizationRole(
  actor: Actor,
  organizationId: string,
): OrganizationRole | null {
  return getOrganizationMembership(actor, organizationId)?.role ?? null;
}

export function belongsToOrganization(actor: Actor, organizationId: string): boolean {
  return getOrganizationMembership(actor, organizationId) !== null;
}

export function canAccessTenantRecord(actor: Actor, record: TenantRecordAccess): boolean {
  if (actor.platformRole === "saas_admin") {
    return (
      record.sensitivity === "organization_metadata" &&
      (record.permission === "platform:read" ||
        record.permission === "platform:manage" ||
        record.permission === "billing:read") &&
      hasPermission("saas_admin", record.permission)
    );
  }

  const membership = getOrganizationMembership(actor, record.organizationId);
  if (!membership || !hasPermission(membership.role, record.permission)) {
    return false;
  }

  if (record.sensitivity === "health" && membership.role === "organization_admin") {
    return false;
  }

  if (membership.role === "student") {
    if (STUDENT_SELF_PERMISSIONS.includes(record.permission)) {
      return record.ownerUserId === actor.userId;
    }
    if (record.ownerUserId !== null) {
      return record.ownerUserId === actor.userId;
    }
    if (record.sensitivity === "health") {
      return false;
    }
  }

  return true;
}

export function assertTenantRecordAccess(actor: Actor, record: TenantRecordAccess): void {
  if (!canAccessTenantRecord(actor, record)) {
    throw new DomainRuleError(
      "FORBIDDEN",
      "Você não possui permissão para acessar este recurso.",
    );
  }
}
