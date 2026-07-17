import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";

export function AuthShell({ children, title = "Cada treino cria um próximo passo." }: { children: React.ReactNode; title?: string }) {
  return (
    <main id="conteudo" className="auth-page">
      <aside className="auth-aside">
        <Logo />
        <div className="auth-aside__copy">
          <h1>{title}</h1>
          <p>Uma experiência conectada para quem treina, acompanha e faz a operação acontecer.</p>
          <div className="auth-aside__proof">
            <span><CheckCircle2 size={17} /> Seus dados ficam no contexto certo.</span>
            <span><CheckCircle2 size={17} /> Seu progresso não se perde no caminho.</span>
            <span><CheckCircle2 size={17} /> Cada perfil vê apenas o necessário.</span>
          </div>
        </div>
        <span className="auth-aside__footer">Ativelo · Treino conectado. Evolução visível.</span>
      </aside>
      <section className="auth-main">
        <div className="auth-main__top"><ThemeToggle /><ButtonLink href="/" variant="secondary" size="sm">Voltar ao site</ButtonLink></div>
        {children}
      </section>
    </main>
  );
}
