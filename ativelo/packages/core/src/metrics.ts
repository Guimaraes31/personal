import { metricsReferenceDateSchema } from "./schemas";
import type {
  BodyMeasurement,
  ClassBooking,
  ClassSession,
  DemoData,
  WorkoutSession,
} from "./types";
import { parseDomainInput } from "./validation";
import { calculateSessionDurationMinutes, calculateSessionVolume } from "./workouts";

const DAY_IN_MILLISECONDS = 86_400_000;

export interface StudentMetrics {
  completedWorkouts: number;
  weeklyFrequency: number;
  currentStreakDays: number;
  totalVolume: number;
  averageDurationMinutes: number;
  latestWeightKg: number | null;
  weightDeltaKg: number | null;
}

export interface ClassMetrics {
  scheduledClasses: number;
  confirmedBookings: number;
  waitlistedBookings: number;
  totalCapacity: number;
  occupancyRate: number;
}

export interface OrganizationMetrics {
  students: number;
  professionals: number;
  activeStudents: number;
  inactiveStudents: number;
  completedWorkoutsLast30Days: number;
  confirmedBookings: number;
  waitlistedBookings: number;
  classOccupancyRate: number;
}

export interface SaasMetrics {
  organizations: number;
  activeOrganizations: number;
  trials: number;
  suspendedOrganizations: number;
  subscriptionsByPlan: Record<string, number>;
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(date: Date): number {
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return startOfUtcDay(date) - daysSinceMonday * DAY_IN_MILLISECONDS;
}

function calculateCurrentStreak(sessions: readonly WorkoutSession[], referenceDate: Date): number {
  const completedDays = [
    ...new Set(
      sessions
        .filter((session) => session.status === "completed" && session.completedAt)
        .map((session) => startOfUtcDay(new Date(session.completedAt as string))),
    ),
  ].sort((left, right) => right - left);

  const latestDay = completedDays[0];
  if (latestDay === undefined) {
    return 0;
  }

  const referenceDay = startOfUtcDay(referenceDate);
  if (referenceDay - latestDay > DAY_IN_MILLISECONDS) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < completedDays.length; index += 1) {
    const previous = completedDays[index - 1];
    const current = completedDays[index];
    if (previous === undefined || current === undefined || previous - current !== DAY_IN_MILLISECONDS) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export function calculateStudentMetrics(
  studentId: string,
  sessions: readonly WorkoutSession[],
  measurements: readonly BodyMeasurement[],
  referenceDateInput: string,
): StudentMetrics {
  const referenceDate = new Date(
    parseDomainInput(metricsReferenceDateSchema, referenceDateInput),
  );
  const studentSessions = sessions.filter(
    (session) =>
      session.studentId === studentId &&
      session.status === "completed" &&
      session.completedAt !== null &&
      Date.parse(session.completedAt) <= referenceDate.getTime(),
  );
  const weekStart = startOfUtcWeek(referenceDate);
  const weekEnd = weekStart + 7 * DAY_IN_MILLISECONDS;
  const weeklyFrequency = studentSessions.filter((session) => {
    const completedAt = Date.parse(session.completedAt as string);
    return completedAt >= weekStart && completedAt < weekEnd;
  }).length;

  const durations = studentSessions
    .map(calculateSessionDurationMinutes)
    .filter((duration): duration is number => duration !== null);
  const sortedMeasurements = measurements
    .filter(
      (measurement) =>
        measurement.studentId === studentId &&
        Date.parse(measurement.measuredAt) <= referenceDate.getTime(),
    )
    .sort((left, right) => Date.parse(left.measuredAt) - Date.parse(right.measuredAt));
  const firstMeasurement = sortedMeasurements[0];
  const latestMeasurement = sortedMeasurements.at(-1);

  return {
    completedWorkouts: studentSessions.length,
    weeklyFrequency,
    currentStreakDays: calculateCurrentStreak(studentSessions, referenceDate),
    totalVolume: studentSessions.reduce(
      (total, session) => total + calculateSessionVolume(session),
      0,
    ),
    averageDurationMinutes:
      durations.length === 0
        ? 0
        : Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length),
    latestWeightKg: latestMeasurement?.weightKg ?? null,
    weightDeltaKg:
      firstMeasurement && latestMeasurement
        ? Number((latestMeasurement.weightKg - firstMeasurement.weightKg).toFixed(1))
        : null,
  };
}

export function calculateClassMetrics(
  classes: readonly ClassSession[],
  bookings: readonly ClassBooking[],
): ClassMetrics {
  const scheduledClasses = classes.filter((classSession) => classSession.status === "scheduled");
  const scheduledIds = new Set(scheduledClasses.map((classSession) => classSession.id));
  const relevantBookings = bookings.filter((booking) =>
    scheduledIds.has(booking.classSessionId),
  );
  const confirmedBookings = relevantBookings.filter(
    (booking) => booking.status === "confirmed" || booking.status === "attended",
  ).length;
  const waitlistedBookings = relevantBookings.filter(
    (booking) => booking.status === "waitlisted",
  ).length;
  const totalCapacity = scheduledClasses.reduce(
    (total, classSession) => total + classSession.capacity,
    0,
  );

  return {
    scheduledClasses: scheduledClasses.length,
    confirmedBookings,
    waitlistedBookings,
    totalCapacity,
    occupancyRate:
      totalCapacity === 0 ? 0 : Number(((confirmedBookings / totalCapacity) * 100).toFixed(1)),
  };
}

export function calculateOrganizationMetrics(
  data: DemoData,
  organizationId: string,
  referenceDateInput: string,
): OrganizationMetrics {
  const referenceDate = new Date(
    parseDomainInput(metricsReferenceDateSchema, referenceDateInput),
  );
  const memberships = data.memberships.filter(
    (membership) => membership.organizationId === organizationId && membership.active,
  );
  const studentIds = new Set(
    memberships
      .filter((membership) => membership.role === "student")
      .map((membership) => membership.userId),
  );
  const thirtyDaysAgo = referenceDate.getTime() - 30 * DAY_IN_MILLISECONDS;
  const sessions = data.workoutSessions.filter(
    (session) =>
      session.organizationId === organizationId &&
      session.status === "completed" &&
      session.completedAt !== null &&
      Date.parse(session.completedAt) >= thirtyDaysAgo &&
      Date.parse(session.completedAt) <= referenceDate.getTime(),
  );
  const activeStudentIds = new Set(sessions.map((session) => session.studentId));
  const classMetrics = calculateClassMetrics(
    data.classSessions.filter((classSession) => classSession.organizationId === organizationId),
    data.classBookings.filter((booking) => booking.organizationId === organizationId),
  );

  return {
    students: studentIds.size,
    professionals: memberships.filter((membership) => membership.role === "professional").length,
    activeStudents: [...studentIds].filter((studentId) => activeStudentIds.has(studentId)).length,
    inactiveStudents: [...studentIds].filter((studentId) => !activeStudentIds.has(studentId)).length,
    completedWorkoutsLast30Days: sessions.length,
    confirmedBookings: classMetrics.confirmedBookings,
    waitlistedBookings: classMetrics.waitlistedBookings,
    classOccupancyRate: classMetrics.occupancyRate,
  };
}

export function calculateSaasMetrics(
  data: Pick<DemoData, "organizations" | "subscriptions">,
): SaasMetrics {
  const subscriptionsByPlan = data.subscriptions.reduce<Record<string, number>>(
    (totals, subscription) => {
      totals[subscription.planCode] = (totals[subscription.planCode] ?? 0) + 1;
      return totals;
    },
    {},
  );

  return {
    organizations: data.organizations.length,
    activeOrganizations: data.organizations.filter(
      (organization) => organization.status === "active",
    ).length,
    trials: data.subscriptions.filter((subscription) => subscription.status === "trialing").length,
    suspendedOrganizations: data.organizations.filter(
      (organization) => organization.status === "suspended",
    ).length,
    subscriptionsByPlan,
  };
}
