export const ROLES = [
  "student",
  "professional",
  "organization_admin",
  "saas_admin",
] as const;

export type Role = (typeof ROLES)[number];
export type OrganizationRole = Exclude<Role, "saas_admin">;

export const ORGANIZATION_STATUSES = ["trial", "active", "suspended"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export interface Organization {
  id: string;
  slug: string;
  name: string;
  status: OrganizationStatus;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  platformRole: "saas_admin" | null;
  createdAt: string;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  active: boolean;
  createdAt: string;
}

export interface Actor {
  userId: string;
  platformRole: "saas_admin" | null;
  memberships: OrganizationMembership[];
}

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "glutes",
  "core",
  "full_body",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface Exercise {
  id: string;
  organizationId: string | null;
  name: string;
  description: string;
  instructions: string[];
  primaryMuscleGroup: MuscleGroup;
  equipment: string;
  active: boolean;
}

export type LoadUnit = "kg" | "lb" | "bodyweight";

export interface WorkoutExercisePrescription {
  id: string;
  exerciseId: string;
  order: number;
  sets: number;
  repetitions: number;
  suggestedLoad: number;
  loadUnit: LoadUnit;
  restSeconds: number;
  notes: string;
}

export interface WorkoutPlan {
  id: string;
  organizationId: string;
  studentId: string;
  professionalId: string;
  name: string;
  objective: string;
  scheduledWeekdays: number[];
  version: number;
  active: boolean;
  exercises: WorkoutExercisePrescription[];
  createdAt: string;
  updatedAt: string;
}

export type WorkoutSetStatus = "pending" | "completed" | "skipped";

export interface WorkoutSetRecord {
  id: string;
  workoutExerciseId: string;
  exerciseId: string;
  setNumber: number;
  targetRepetitions: number;
  repetitions: number | null;
  load: number | null;
  loadUnit: LoadUnit;
  status: WorkoutSetStatus;
  completedAt: string | null;
}

export type WorkoutSessionStatus = "in_progress" | "completed" | "abandoned";

export interface WorkoutSession {
  id: string;
  organizationId: string;
  workoutPlanId: string;
  studentId: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  perceivedEffort: number | null;
  feedback: string;
  sets: WorkoutSetRecord[];
}

export interface BodyMeasurement {
  id: string;
  organizationId: string;
  studentId: string;
  measuredAt: string;
  weightKg: number;
  bodyFatPercentage: number | null;
  waistCm: number | null;
}

export type ClassStatus = "scheduled" | "cancelled" | "completed";

export interface ClassSession {
  id: string;
  organizationId: string;
  title: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  waitlistEnabled: boolean;
  status: ClassStatus;
}

export type ClassBookingStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "attended"
  | "absent";

export interface ClassBooking {
  id: string;
  organizationId: string;
  classSessionId: string;
  studentId: string;
  status: ClassBookingStatus;
  createdAt: string;
  updatedAt: string;
}

export type PlanCode = "personal" | "essential" | "professional" | "network";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export interface Subscription {
  id: string;
  organizationId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  studentLimit: number;
  professionalLimit: number;
  unitLimit: number;
  trialEndsAt: string | null;
}

export interface DemoData {
  organizations: Organization[];
  users: User[];
  memberships: OrganizationMembership[];
  exercises: Exercise[];
  workoutPlans: WorkoutPlan[];
  workoutSessions: WorkoutSession[];
  bodyMeasurements: BodyMeasurement[];
  classSessions: ClassSession[];
  classBookings: ClassBooking[];
  subscriptions: Subscription[];
}

export interface DemoAccount {
  userId: string;
  label: string;
  role: Role;
  organizationId: string | null;
}
