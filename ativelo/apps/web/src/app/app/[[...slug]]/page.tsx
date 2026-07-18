import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClassesScreen } from "@/components/app/classes-screen";
import { DashboardScreen } from "@/components/app/dashboard-screens";
import { EvolutionScreen, HistoryScreen } from "@/components/app/history-evolution-screens";
import { PeopleScreen, StudentDetailScreen, StudentsScreen } from "@/components/app/people-screens";
import {
  AuditScreen,
  OrganizationScreen,
  PlansScreen,
  PlatformScreen,
  PrivacyScreen,
  ProfileScreen,
  ReportsScreen,
  SupportScreen
} from "@/components/app/secondary-screens";
import { WorkoutBuilderScreen, WorkoutsScreen } from "@/components/app/workout-screens";
import { WorkoutSessionScreen } from "@/components/app/workout-session-screen";

function LoadingScreen() {
  return (
    <div className="empty-state" role="status">
      <div>
        <div className="skeleton" style={{ width: 180, height: 20, margin: "0 auto 12px" }} />
        <div className="skeleton" style={{ width: 280, height: 12 }} />
      </div>
    </div>
  );
}

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  if (slug.length === 0) redirect("/app/inicio");

  const [section, id] = slug;
  let screen: React.ReactNode;

  if (section === "inicio") screen = <DashboardScreen />;
  else if (section === "treinos" && id === "novo") screen = <WorkoutBuilderScreen />;
  else if (section === "treinos") screen = <WorkoutsScreen />;
  else if (section === "sessoes" && id) screen = <WorkoutSessionScreen sessionId={id} />;
  else if (section === "historico") screen = <HistoryScreen />;
  else if (section === "evolucao") screen = <EvolutionScreen />;
  else if (section === "aulas") screen = <ClassesScreen />;
  else if (section === "alunos" && id) screen = <StudentDetailScreen studentId={id} />;
  else if (section === "alunos") screen = <StudentsScreen />;
  else if (section === "pessoas") screen = <PeopleScreen />;
  else if (section === "organizacao") screen = <OrganizationScreen />;
  else if (section === "relatorios") screen = <ReportsScreen />;
  else if (section === "plataforma")
    screen = id ? <PlatformScreen organizationId={id} /> : <PlatformScreen />;
  else if (section === "planos") screen = <PlansScreen />;
  else if (section === "auditoria") screen = <AuditScreen />;
  else if (section === "suporte" || section === "mensagens") screen = <SupportScreen />;
  else if (section === "perfil") screen = <ProfileScreen />;
  else if (section === "privacidade") screen = <PrivacyScreen />;
  else redirect("/app/inicio");

  return <Suspense fallback={<LoadingScreen />}>{screen}</Suspense>;
}
