import { z } from "zod";

import {
  MUSCLE_GROUPS,
  ORGANIZATION_STATUSES,
  ROLES,
  type BodyMeasurement,
  type ClassBooking,
  type ClassSession,
  type Exercise,
  type Organization,
  type OrganizationMembership,
  type Subscription,
  type User,
  type WorkoutPlan,
  type WorkoutSession,
} from "./types";

const idSchema = z.string().trim().min(1).max(120);
const isoDateTimeSchema = z.string().datetime({ offset: true });

export const roleSchema = z.enum(ROLES);
export const organizationRoleSchema = z.enum([
  "student",
  "professional",
  "organization_admin",
]);

export const organizationSchema: z.ZodType<Organization> = z.object({
  id: idSchema,
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(120),
  status: z.enum(ORGANIZATION_STATUSES),
  createdAt: isoDateTimeSchema,
});

export const userSchema: z.ZodType<User> = z.object({
  id: idSchema,
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  platformRole: z.literal("saas_admin").nullable(),
  createdAt: isoDateTimeSchema,
});

export const organizationMembershipSchema: z.ZodType<OrganizationMembership> = z.object({
  id: idSchema,
  organizationId: idSchema,
  userId: idSchema,
  role: organizationRoleSchema,
  active: z.boolean(),
  createdAt: isoDateTimeSchema,
});

export const exerciseSchema: z.ZodType<Exercise> = z.object({
  id: idSchema,
  organizationId: idSchema.nullable(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(500),
  instructions: z.array(z.string().trim().min(1).max(240)).min(1),
  primaryMuscleGroup: z.enum(MUSCLE_GROUPS),
  equipment: z.string().trim().min(1).max(80),
  active: z.boolean(),
});

export const workoutExercisePrescriptionSchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  order: z.number().int().min(0),
  sets: z.number().int().min(1).max(20),
  repetitions: z.number().int().min(1).max(1_000),
  suggestedLoad: z.number().finite().min(0).max(10_000),
  loadUnit: z.enum(["kg", "lb", "bodyweight"]),
  restSeconds: z.number().int().min(0).max(3_600),
  notes: z.string().trim().max(500),
});

export const workoutPlanSchema: z.ZodType<WorkoutPlan> = z.object({
  id: idSchema,
  organizationId: idSchema,
  studentId: idSchema,
  professionalId: idSchema,
  name: z.string().trim().min(2).max(120),
  objective: z.string().trim().min(2).max(240),
  scheduledWeekdays: z.array(z.number().int().min(0).max(6)).min(1),
  version: z.number().int().min(1),
  active: z.boolean(),
  exercises: z.array(workoutExercisePrescriptionSchema).min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const workoutSetRecordSchema = z.object({
  id: idSchema,
  workoutExerciseId: idSchema,
  exerciseId: idSchema,
  setNumber: z.number().int().min(1),
  targetRepetitions: z.number().int().min(1).max(1_000),
  repetitions: z.number().int().min(0).max(1_000).nullable(),
  load: z.number().finite().min(0).max(10_000).nullable(),
  loadUnit: z.enum(["kg", "lb", "bodyweight"]),
  status: z.enum(["pending", "completed", "skipped"]),
  completedAt: isoDateTimeSchema.nullable(),
});

export const workoutSessionSchema: z.ZodType<WorkoutSession> = z.object({
  id: idSchema,
  organizationId: idSchema,
  workoutPlanId: idSchema,
  studentId: idSchema,
  status: z.enum(["in_progress", "completed", "abandoned"]),
  startedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.nullable(),
  perceivedEffort: z.number().int().min(1).max(10).nullable(),
  feedback: z.string().trim().max(1_000),
  sets: z.array(workoutSetRecordSchema).min(1),
});

export const bodyMeasurementSchema: z.ZodType<BodyMeasurement> = z.object({
  id: idSchema,
  organizationId: idSchema,
  studentId: idSchema,
  measuredAt: isoDateTimeSchema,
  weightKg: z.number().finite().positive().max(500),
  bodyFatPercentage: z.number().finite().min(0).max(100).nullable(),
  waistCm: z.number().finite().positive().max(400).nullable(),
});

export const classSessionSchema: z.ZodType<ClassSession> = z
  .object({
    id: idSchema,
    organizationId: idSchema,
    title: z.string().trim().min(2).max(120),
    professionalId: idSchema,
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    capacity: z.number().int().min(1).max(10_000),
    waitlistEnabled: z.boolean(),
    status: z.enum(["scheduled", "cancelled", "completed"]),
  })
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: "O fim da aula deve ocorrer depois do início.",
    path: ["endsAt"],
  });

export const classBookingSchema: z.ZodType<ClassBooking> = z.object({
  id: idSchema,
  organizationId: idSchema,
  classSessionId: idSchema,
  studentId: idSchema,
  status: z.enum(["confirmed", "waitlisted", "cancelled", "attended", "absent"]),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const subscriptionSchema: z.ZodType<Subscription> = z.object({
  id: idSchema,
  organizationId: idSchema,
  planCode: z.enum(["personal", "essential", "professional", "network"]),
  status: z.enum(["trialing", "active", "past_due", "cancelled"]),
  studentLimit: z.number().int().min(1),
  professionalLimit: z.number().int().min(1),
  unitLimit: z.number().int().min(1),
  trialEndsAt: isoDateTimeSchema.nullable(),
});

export const reserveClassInputSchema = z.object({
  bookingId: idSchema,
  organizationId: idSchema,
  studentId: idSchema,
  now: isoDateTimeSchema,
});

export const cancelClassBookingInputSchema = z.object({
  bookingId: idSchema,
  organizationId: idSchema,
  now: isoDateTimeSchema,
});

export const startWorkoutSessionInputSchema = z.object({
  sessionId: idSchema,
  now: isoDateTimeSchema,
});

export const recordExerciseSetInputSchema = z.object({
  setId: idSchema,
  repetitions: z.number().int().min(0).max(1_000),
  load: z.number().finite().min(0).max(10_000),
  now: isoDateTimeSchema,
});

export const skipExerciseSetInputSchema = z.object({
  setId: idSchema,
  now: isoDateTimeSchema,
});

export const completeWorkoutSessionInputSchema = z.object({
  perceivedEffort: z.number().int().min(1).max(10),
  feedback: z.string().trim().max(1_000),
  now: isoDateTimeSchema,
});

export const metricsReferenceDateSchema = isoDateTimeSchema;

