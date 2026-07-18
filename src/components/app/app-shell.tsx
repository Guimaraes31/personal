"use client";

import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  FlaskConical,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearDemoSession, readDemoSession, type AppRole, type DemoSession } from "@/lib/auth/session";

type Icon = typeof LayoutDashboard;
type NavItem = { href: string; label: string; icon: Icon; badge?: number };

const roleLabels: Record<AppRole, string> = {
  student: "Aluno",
  professional: "Professor",
  organization_admin: "Gestão da academia",
  saas_admin: "Administração SaaS"
};

const navByRole: Record<AppRole, NavItem[]> = {
  student: [
    { href: "/app/inicio", label: "Início", icon: LayoutDashboard },
    { href: "/app/treinos", label: "Treinos", icon: Dumbbell },
    { href: "/app/evolucao", label: "Evolução", icon: TrendingUp },
    { href: "/app/aulas", label: "Aulas", icon: CalendarDays },
    { href: "/app/historico", label: "Histórico", icon: History }
  ],
  professional: [
    { href: "/app/inicio", label: "Início", icon: LayoutDashboard },
    { href: "/app/alunos", label: "Alunos", icon: UsersRound },
    { href: "/app/treinos", label: "Treinos", icon: ClipboardList },
    { href: "/app/aulas", label: "Agenda", icon: CalendarDays },
    { href: "/app/mensagens", label: "Mensagens", icon: MessageSquareText, badge: 2 }
  ],
  organization_admin: [
    { href: "/app/inicio", label: "Visão geral", icon: LayoutDashboard },
    { href: "/app/pessoas", label: "Pessoas", icon: UsersRound },
    { href: "/app/aulas", label: "Agenda", icon: CalendarDays },
    { href: "/app/organizacao", label: "Organização", icon: Building2 },
    { href: "/app/relatorios", label: "Relatórios", icon: BarChart3 }
  ],
  saas_admin: [
    { href: "/app/inicio", label: "Visão geral", icon: LayoutDashboard },
    { href: "/app/plataforma", label: "Academias", icon: Building2 },
    { href: "/app/planos", label: "Planos", icon: ReceiptText },
    { href: "/app/auditoria", label: "Auditoria", icon: ShieldCheck },
    { href: "/app/suporte", label: "Suporte", icon: MessageSquareText, badge: 3 }
  ]
};

const titleByPath: Record<string, string> = {
  inicio: "Início",
  treinos: "Treinos",
  evolucao: "Evolução",
  aulas: "Agenda de aulas",
  historico: "Histórico",
  alunos: "Alunos",
  pessoas: "Pessoas",
  organizacao: "Organização",
  plataforma: "Academias clientes",
  planos: "Planos e limites",
  auditoria: "Auditoria",
  relatorios: "Relatórios",
  mensagens: "Mensagens",
  suporte: "Suporte",
  perfil: "Meu perfil",
  privacidade: "Privacidade e dados"
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/app/inicio" && pathname.startsWith(`${href}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(3);

  useEffect(() => {
    const current = readDemoSession();
    if (!current) {
      router.replace(`/entrar?redirect=${encodeURIComponent(pathname)}`);
      setHydrated(true);
      return;
    }
    setSession(current);
    setHydrated(true);

    const onSession = () => setSession(readDemoSession());
    window.addEventListener("ativelo:session", onSession);
    return () => window.removeEventListener("ativelo:session", onSession);
    // pathname only used for redirect target when unauthenticated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const navItems = useMemo(() => (session ? navByRole[session.role] : []), [session]);
  const currentSegment = pathname.split("/").filter(Boolean)[1] ?? "inicio";
  const pageTitle = titleByPath[currentSegment] ?? "Ativelo";

  if (!hydrated || !session) {
    return (
      <div className="app-loading" role="status">
        <div className="app-loading__content"><Logo /><span>Preparando seu espaço…</span></div>
      </div>
    );
  }

  if (pathname.startsWith("/app/sessoes/")) {
    return <>{children}</>;
  }

  function logout() {
    clearDemoSession();
    router.replace("/entrar");
  }

  const orgName = session.organizationName ?? "Ativelo Cloud";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand"><Logo href="/app/inicio" /></div>
        <div className="organization-switcher" title={orgName}>
          <span className="organization-switcher__logo">{session.organizationName ? initials(session.organizationName) : "AT"}</span>
          <span><strong>{orgName}</strong><small>{session.organizationName ? "Unidade Centro" : "Operação da plataforma"}</small></span>
          <ChevronDown size={15} />
        </div>
        <nav className="sidebar-nav" aria-label="Navegação do aplicativo">
          <span className="sidebar-nav__label">Espaço de trabalho</span>
          {navItems.map(({ href, label, icon: Icon, badge }) => (
            <Link className={`sidebar-link${isActive(pathname, href) ? " sidebar-link--active" : ""}`} href={href} key={href} aria-current={isActive(pathname, href) ? "page" : undefined} title={label}>
              <Icon size={19} /><span>{label}</span>{badge ? <span className="sidebar-link__badge">{badge}</span> : null}
            </Link>
          ))}
          <span className="sidebar-nav__label" style={{ marginTop: 16 }}>Conta</span>
          <Link className={`sidebar-link${isActive(pathname, "/app/perfil") ? " sidebar-link--active" : ""}`} href="/app/perfil" title="Meu perfil"><UserRound size={19} /><span>Meu perfil</span></Link>
          <Link className={`sidebar-link${isActive(pathname, "/app/privacidade") ? " sidebar-link--active" : ""}`} href="/app/privacidade" title="Privacidade"><SlidersHorizontal size={19} /><span>Privacidade</span></Link>
        </nav>
        <div className="app-sidebar__footer">
          <div className="sidebar-user">
            <span className="avatar">{initials(session.name)}</span>
            <span><strong>{session.name}</strong><small>{roleLabels[session.role]}</small></span>
            <button className="sidebar-user__logout" type="button" onClick={logout} aria-label="Sair"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__title"><span>{roleLabels[session.role]}</span><strong>{pageTitle}</strong></div>
          <div className="app-topbar__actions">
            <span className="demo-mode-pill"><FlaskConical size={14} /> Modo demonstração</span>
            <ThemeToggle />
            <button className="icon-button notification-button" type="button" onClick={() => setNotificationsOpen(true)} aria-label={`${unread} notificações não lidas`}><Bell size={19} /></button>
          </div>
        </header>
        <main id="conteudo" className="app-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Navegação móvel" style={{ "--mobile-items": Math.min(navItems.length, 5) } as React.CSSProperties}>
        {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link className={`mobile-nav__link${isActive(pathname, href) ? " mobile-nav__link--active" : ""}`} href={href} key={href} aria-current={isActive(pathname, href) ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>
        ))}
      </nav>

      {notificationsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setNotificationsOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
            <header className="modal__header"><div><h2 id="notifications-title">Notificações</h2><p>Atualizações relevantes para o seu perfil.</p></div><button className="modal__close" type="button" onClick={() => setNotificationsOpen(false)} aria-label="Fechar"><X size={18} /></button></header>
            <div className="modal__body">
              <div className="list">
                <div className="list-row"><span className="list-row__icon"><Dumbbell size={18} /></span><span className="list-row__main"><strong>{session.role === "student" ? "Treino atualizado por Caio" : "Lia concluiu Força essencial A"}</strong><small>Há 18 minutos · Academia Horizonte</small></span><span className="badge badge--brand">Nova</span></div>
                <div className="list-row"><span className="list-row__icon"><CalendarDays size={18} /></span><span className="list-row__main"><strong>Reserva de aula confirmada</strong><small>Funcional express · domingo, 10h</small></span><span className="badge badge--brand">Nova</span></div>
                <div className="list-row"><span className="list-row__icon"><TrendingUp size={18} /></span><span className="list-row__main"><strong>Resumo semanal disponível</strong><small>Veja os principais sinais da semana.</small></span><span className="badge badge--brand">Nova</span></div>
              </div>
            </div>
            <footer className="modal__footer"><Button variant="secondary" onClick={() => { setUnread(0); setNotificationsOpen(false); }}>Marcar todas como lidas</Button></footer>
          </section>
        </div>
      )}
    </div>
  );
}
