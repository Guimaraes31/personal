import {
  bodyMeasurementSchema,
  classBookingSchema,
  classSessionSchema,
  exerciseSchema,
  organizationMembershipSchema,
  organizationSchema,
  subscriptionSchema,
  userSchema,
  workoutPlanSchema,
  workoutSessionSchema,
} from "./schemas";
import type {
  DemoAccount,
  DemoData,
  Exercise,
  Organization,
  OrganizationMembership,
  User,
  WorkoutPlan,
  WorkoutSession,
} from "./types";
import { parseDomainInput } from "./validation";
import {
  completeWorkoutSession,
  recordExerciseSet,
  startWorkoutSession,
} from "./workouts";

export const DEMO_NOW = "2026-07-17T12:00:00.000Z";
export const DEMO_ORGANIZATION_IDS = {
  primary: "org-horizonte",
  secondary: "org-impulso",
} as const;

export const DEMO_USER_IDS = {
  student: "user-aluna-lia",
  secondStudent: "user-aluna-beatriz",
  professional: "user-profissional-caio",
  organizationAdmin: "user-admin-marina",
  saasAdmin: "user-saas-alex",
  secondaryOrganizationStudent: "user-aluno-davi",
  secondaryOrganizationProfessional: "user-profissional-iris",
} as const;

const organizations: Organization[] = [
  {
    id: DEMO_ORGANIZATION_IDS.primary,
    slug: "academia-horizonte",
    name: "Academia Horizonte",
    status: "active",
    createdAt: "2025-10-06T12:00:00.000Z",
  },
  {
    id: DEMO_ORGANIZATION_IDS.secondary,
    slug: "studio-impulso",
    name: "Studio Impulso",
    status: "trial",
    createdAt: "2026-07-06T12:00:00.000Z",
  },
];

const users: User[] = [
  {
    id: DEMO_USER_IDS.student,
    name: "Lia Martins",
    email: "lia@example.com",
    platformRole: null,
    createdAt: "2026-01-12T12:00:00.000Z",
  },
  {
    id: DEMO_USER_IDS.secondStudent,
    name: "Beatriz Nunes",
    email: "beatriz@example.com",
    platformRole: null,
    createdAt: "2026-02-09T12:00:00.000Z",
  },
  {
    id: DEMO_USER_IDS.professional,
    name: "Caio Ribeiro",
    email: "caio@example.com",
    platformRole: null,
    createdAt: "2025-11-03T12:00:00.000Z",
  },
  {
    id: DEMO_USER_IDS.organizationAdmin,
    name: "Marina Costa",
    email: "marina@example.com",
    platformRole: null,
    createdAt: "2025-10-06T12:00:00.000Z",
  },
  {
    id: DEMO_USER_IDS.saasAdmin,
    name: "Alex Santana",
    email: "alex@example.com",
    platformRole: "saas_admin",
    createdAt: "2025-09-01T12:00:00.000Z",
  },
  {
    id: DEMO_USER_IDS.secondaryOrganizationStudent,
    name: "Davi Oliveira",
    email: "davi@example.com",
    platformRole: null,
    createdAt: "2026-07-07T12:00:00.000Z",
  },
  {
    id: DEMO_USER_IDS.secondaryOrganizationProfessional,
    name: "Íris Almeida",
    email: "iris@example.com",
    platformRole: null,
    createdAt: "2026-07-06T12:00:00.000Z",
  },
];

const memberships: OrganizationMembership[] = [
  {
    id: "membership-horizonte-lia",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
    userId: DEMO_USER_IDS.student,
    role: "student",
    active: true,
    createdAt: "2026-01-12T12:00:00.000Z",
  },
  {
    id: "membership-horizonte-beatriz",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
    userId: DEMO_USER_IDS.secondStudent,
    role: "student",
    active: true,
    createdAt: "2026-02-09T12:00:00.000Z",
  },
  {
    id: "membership-horizonte-caio",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
    userId: DEMO_USER_IDS.professional,
    role: "professional",
    active: true,
    createdAt: "2025-11-03T12:00:00.000Z",
  },
  {
    id: "membership-horizonte-marina",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
    userId: DEMO_USER_IDS.organizationAdmin,
    role: "organization_admin",
    active: true,
    createdAt: "2025-10-06T12:00:00.000Z",
  },
  {
    id: "membership-impulso-davi",
    organizationId: DEMO_ORGANIZATION_IDS.secondary,
    userId: DEMO_USER_IDS.secondaryOrganizationStudent,
    role: "student",
    active: true,
    createdAt: "2026-07-07T12:00:00.000Z",
  },
  {
    id: "membership-impulso-iris",
    organizationId: DEMO_ORGANIZATION_IDS.secondary,
    userId: DEMO_USER_IDS.secondaryOrganizationProfessional,
    role: "professional",
    active: true,
    createdAt: "2026-07-06T12:00:00.000Z",
  },
];

const exercises: Exercise[] = [
  {
    id: "exercise-squat",
    organizationId: null,
    name: "Agachamento livre",
    description: "Movimento de força para pernas e quadril.",
    instructions: [
      "Mantenha os pés firmes e o tronco estável.",
      "Desça com controle e empurre o chão para subir.",
    ],
    primaryMuscleGroup: "legs",
    equipment: "Barra",
    active: true,
  },
  {
    id: "exercise-row",
    organizationId: null,
    name: "Remada sentada",
    description: "Puxada horizontal com foco nas costas.",
    instructions: ["Mantenha a coluna neutra.", "Leve os cotovelos para trás sem elevar os ombros."],
    primaryMuscleGroup: "back",
    equipment: "Cabo",
    active: true,
  },
  {
    id: "exercise-bench-press",
    organizationId: null,
    name: "Supino com halteres",
    description: "Empurrada horizontal para peitoral e braços.",
    instructions: ["Apoie os pés no chão.", "Controle a descida dos halteres."],
    primaryMuscleGroup: "chest",
    equipment: "Halteres",
    active: true,
  },
  {
    id: "exercise-glute-bridge",
    organizationId: null,
    name: "Ponte de glúteos",
    description: "Extensão de quadril executada no solo.",
    instructions: ["Contraia o abdômen.", "Eleve o quadril sem hiperestender a lombar."],
    primaryMuscleGroup: "glutes",
    equipment: "Peso corporal",
    active: true,
  },
  {
    id: "exercise-plank",
    organizationId: null,
    name: "Prancha frontal",
    description: "Estabilização isométrica de tronco.",
    instructions: ["Alinhe ombros, quadril e tornozelos.", "Respire sem perder a postura."],
    primaryMuscleGroup: "core",
    equipment: "Peso corporal",
    active: true,
  },
  {
    id: "exercise-shoulder-press",
    organizationId: null,
    name: "Desenvolvimento sentado",
    description: "Empurrada vertical para ombros.",
    instructions: ["Mantenha o tronco apoiado.", "Evite travar os cotovelos no topo."],
    primaryMuscleGroup: "shoulders",
    equipment: "Halteres",
    active: true,
  },
];

const workoutPlans: WorkoutPlan[] = [
  {
    id: "plan-horizonte-forca-a",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
    studentId: DEMO_USER_IDS.student,
    professionalId: DEMO_USER_IDS.professional,
    name: "Força essencial A",
    objective: "Evoluir força com movimentos fundamentais.",
    scheduledWeekdays: [1, 3, 5],
    version: 1,
    active: true,
    exercises: [
      {
        id: "prescription-squat",
        exerciseId: "exercise-squat",
        order: 0,
        sets: 2,
        repetitions: 8,
        suggestedLoad: 30,
        loadUnit: "kg",
        restSeconds: 90,
        notes: "Priorize amplitude confortável.",
      },
      {
        id: "prescription-row",
        exerciseId: "exercise-row",
        order: 1,
        sets: 2,
        repetitions: 10,
        suggestedLoad: 24,
        loadUnit: "kg",
        restSeconds: 60,
        notes: "Segure um segundo ao final da puxada.",
      },
    ],
    createdAt: "2026-06-29T12:00:00.000Z",
    updatedAt: "2026-07-13T12:00:00.000Z",
  },
  {
    id: "plan-impulso-base",
    organizationId: DEMO_ORGANIZATION_IDS.secondary,
    studentId: DEMO_USER_IDS.secondaryOrganizationStudent,
    professionalId: DEMO_USER_IDS.secondaryOrganizationProfessional,
    name: "Base funcional",
    objective: "Criar consistência e controle corporal.",
    scheduledWeekdays: [2, 4],
    version: 1,
    active: true,
    exercises: [
      {
        id: "prescription-plank",
        exerciseId: "exercise-plank",
        order: 0,
        sets: 2,
        repetitions: 30,
        suggestedLoad: 0,
        loadUnit: "bodyweight",
        restSeconds: 45,
        notes: "Cada repetição representa um segundo.",
      },
    ],
    createdAt: "2026-07-08T12:00:00.000Z",
    updatedAt: "2026-07-08T12:00:00.000Z",
  },
];

function createCompletedDemoSession(
  plan: WorkoutPlan,
  sessionId: string,
  startedAt: string,
  completedAt: string,
  loadOffset: number,
): WorkoutSession {
  let session = startWorkoutSession(plan, { sessionId, now: startedAt });

  for (const [index, set] of session.sets.entries()) {
    const prescription = plan.exercises.find(
      (candidate) => candidate.id === set.workoutExerciseId,
    );
    session = recordExerciseSet(session, {
      setId: set.id,
      repetitions: set.targetRepetitions,
      load: (prescription?.suggestedLoad ?? 0) + loadOffset + index,
      now: completedAt,
    });
  }

  return completeWorkoutSession(session, {
    perceivedEffort: 7,
    feedback: "Sessão concluída com boa técnica.",
    now: completedAt,
  });
}

const primaryPlan = workoutPlans[0] as WorkoutPlan;
const secondaryPlan = workoutPlans[1] as WorkoutPlan;
const inProgressSession = recordExerciseSet(
  startWorkoutSession(primaryPlan, {
    sessionId: "session-horizonte-current",
    now: "2026-07-17T11:40:00.000Z",
  }),
  {
    setId: "session-horizonte-current:prescription-squat:1",
    repetitions: 8,
    load: 34,
    now: "2026-07-17T11:44:00.000Z",
  },
);

const workoutSessions: WorkoutSession[] = [
  createCompletedDemoSession(
    primaryPlan,
    "session-horizonte-july-14",
    "2026-07-14T10:00:00.000Z",
    "2026-07-14T10:42:00.000Z",
    0,
  ),
  createCompletedDemoSession(
    primaryPlan,
    "session-horizonte-july-16",
    "2026-07-16T10:00:00.000Z",
    "2026-07-16T10:39:00.000Z",
    2,
  ),
  inProgressSession,
  createCompletedDemoSession(
    secondaryPlan,
    "session-impulso-july-16",
    "2026-07-16T18:00:00.000Z",
    "2026-07-16T18:18:00.000Z",
    0,
  ),
];

const rawDemoData: DemoData = {
  organizations,
  users,
  memberships,
  exercises,
  workoutPlans,
  workoutSessions,
  bodyMeasurements: [
    {
      id: "measurement-lia-june",
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      studentId: DEMO_USER_IDS.student,
      measuredAt: "2026-06-01T09:00:00.000Z",
      weightKg: 70,
      bodyFatPercentage: 27,
      waistCm: 78,
    },
    {
      id: "measurement-lia-july",
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      studentId: DEMO_USER_IDS.student,
      measuredAt: "2026-07-15T09:00:00.000Z",
      weightKg: 68.5,
      bodyFatPercentage: 25.8,
      waistCm: 75.5,
    },
    {
      id: "measurement-davi-july",
      organizationId: DEMO_ORGANIZATION_IDS.secondary,
      studentId: DEMO_USER_IDS.secondaryOrganizationStudent,
      measuredAt: "2026-07-14T09:00:00.000Z",
      weightKg: 82,
      bodyFatPercentage: null,
      waistCm: 88,
    },
  ],
  classSessions: [
    {
      id: "class-horizonte-functional",
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      title: "Funcional express",
      professionalId: DEMO_USER_IDS.professional,
      startsAt: "2026-07-19T13:00:00.000Z",
      endsAt: "2026-07-19T13:45:00.000Z",
      capacity: 1,
      waitlistEnabled: true,
      status: "scheduled",
    },
    {
      id: "class-horizonte-mobility",
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      title: "Mobilidade guiada",
      professionalId: DEMO_USER_IDS.professional,
      startsAt: "2026-07-20T14:00:00.000Z",
      endsAt: "2026-07-20T14:40:00.000Z",
      capacity: 8,
      waitlistEnabled: true,
      status: "scheduled",
    },
    {
      id: "class-impulso-core",
      organizationId: DEMO_ORGANIZATION_IDS.secondary,
      title: "Core e postura",
      professionalId: DEMO_USER_IDS.secondaryOrganizationProfessional,
      startsAt: "2026-07-19T16:00:00.000Z",
      endsAt: "2026-07-19T16:45:00.000Z",
      capacity: 6,
      waitlistEnabled: false,
      status: "scheduled",
    },
  ],
  classBookings: [
    {
      id: "booking-functional-lia",
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      classSessionId: "class-horizonte-functional",
      studentId: DEMO_USER_IDS.student,
      status: "confirmed",
      createdAt: "2026-07-16T12:00:00.000Z",
      updatedAt: "2026-07-16T12:00:00.000Z",
    },
    {
      id: "booking-functional-beatriz",
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      classSessionId: "class-horizonte-functional",
      studentId: DEMO_USER_IDS.secondStudent,
      status: "waitlisted",
      createdAt: "2026-07-16T12:05:00.000Z",
      updatedAt: "2026-07-16T12:05:00.000Z",
    },
    {
      id: "booking-impulso-davi",
      organizationId: DEMO_ORGANIZATION_IDS.secondary,
      classSessionId: "class-impulso-core",
      studentId: DEMO_USER_IDS.secondaryOrganizationStudent,
      status: "confirmed",
      createdAt: "2026-07-16T13:00:00.000Z",
      updatedAt: "2026-07-16T13:00:00.000Z",
    },
  ],
  subscriptions: [
    {
      id: "subscription-horizonte",
      organizationId: DEMO_ORGANIZATION_IDS.primary,
      planCode: "professional",
      status: "active",
      studentLimit: 500,
      professionalLimit: 25,
      unitLimit: 3,
      trialEndsAt: null,
    },
    {
      id: "subscription-impulso",
      organizationId: DEMO_ORGANIZATION_IDS.secondary,
      planCode: "essential",
      status: "trialing",
      studentLimit: 100,
      professionalLimit: 5,
      unitLimit: 1,
      trialEndsAt: "2026-07-27T12:00:00.000Z",
    },
  ],
};

function validateDemoData(data: DemoData): DemoData {
  return {
    organizations: data.organizations.map((item) => parseDomainInput(organizationSchema, item)),
    users: data.users.map((item) => parseDomainInput(userSchema, item)),
    memberships: data.memberships.map((item) =>
      parseDomainInput(organizationMembershipSchema, item),
    ),
    exercises: data.exercises.map((item) => parseDomainInput(exerciseSchema, item)),
    workoutPlans: data.workoutPlans.map((item) => parseDomainInput(workoutPlanSchema, item)),
    workoutSessions: data.workoutSessions.map((item) =>
      parseDomainInput(workoutSessionSchema, item),
    ),
    bodyMeasurements: data.bodyMeasurements.map((item) =>
      parseDomainInput(bodyMeasurementSchema, item),
    ),
    classSessions: data.classSessions.map((item) =>
      parseDomainInput(classSessionSchema, item),
    ),
    classBookings: data.classBookings.map((item) =>
      parseDomainInput(classBookingSchema, item),
    ),
    subscriptions: data.subscriptions.map((item) =>
      parseDomainInput(subscriptionSchema, item),
    ),
  };
}

export const DEMO_DATA = validateDemoData(rawDemoData);
export const demoData = DEMO_DATA;

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    userId: DEMO_USER_IDS.student,
    label: "Aluno",
    role: "student",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
  },
  {
    userId: DEMO_USER_IDS.professional,
    label: "Professor",
    role: "professional",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
  },
  {
    userId: DEMO_USER_IDS.organizationAdmin,
    label: "Administrador da academia",
    role: "organization_admin",
    organizationId: DEMO_ORGANIZATION_IDS.primary,
  },
  {
    userId: DEMO_USER_IDS.saasAdmin,
    label: "Administrador SaaS",
    role: "saas_admin",
    organizationId: null,
  },
];

export const demoAccounts = DEMO_ACCOUNTS;

export function createDemoData(): DemoData {
  return structuredClone(DEMO_DATA);
}
