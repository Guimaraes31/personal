export type AppRole = "student" | "professional" | "organization_admin" | "saas_admin";

export type DemoSession = {
  userId: string;
  name: string;
  email: string;
  role: AppRole;
  organizationId: string | null;
  organizationName: string | null;
  demo: true;
  createdAt: string;
};

const SESSION_KEY = "ativelo:session";

export function readDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as DemoSession;
    if (!parsed.userId || !parsed.role || !parsed.demo) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDemoSession(session: DemoSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("ativelo:session", { detail: session }));
}

export function clearDemoSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("ativelo:session", { detail: null }));
}
