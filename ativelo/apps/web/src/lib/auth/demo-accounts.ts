import type { AppRole, DemoSession } from "@/lib/auth/session";

export type DemoAccount = Omit<DemoSession, "demo" | "createdAt"> & {
  label: string;
  description: string;
  password: string;
};

export const demoAccounts: Record<AppRole, DemoAccount> = {
  student: {
    userId: "user-aluna-lia",
    name: "Lia Martins",
    email: "aluna@demo.ativelo.app",
    password: "Demo@123",
    role: "student",
    organizationId: "org-horizonte",
    organizationName: "Academia Horizonte",
    label: "Aluna",
    description: "Treino, evolução e aulas"
  },
  professional: {
    userId: "user-profissional-caio",
    name: "Caio Ribeiro",
    email: "professor@demo.ativelo.app",
    password: "Demo@123",
    role: "professional",
    organizationId: "org-horizonte",
    organizationName: "Academia Horizonte",
    label: "Professor",
    description: "Alunos e prescrições"
  },
  organization_admin: {
    userId: "user-admin-marina",
    name: "Marina Costa",
    email: "gestora@demo.ativelo.app",
    password: "Demo@123",
    role: "organization_admin",
    organizationId: "org-horizonte",
    organizationName: "Academia Horizonte",
    label: "Gestora",
    description: "Operação da academia"
  },
  saas_admin: {
    userId: "user-saas-alex",
    name: "Alex Santana",
    email: "saas@demo.ativelo.app",
    password: "Demo@123",
    role: "saas_admin",
    organizationId: null,
    organizationName: null,
    label: "Admin SaaS",
    description: "Planos e organizações"
  }
};

export function sessionFor(account: DemoAccount): DemoSession {
  return {
    userId: account.userId,
    name: account.name,
    email: account.email,
    role: account.role,
    organizationId: account.organizationId,
    organizationName: account.organizationName,
    demo: true,
    createdAt: new Date().toISOString()
  };
}
