import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Logo />
        <nav className="site-nav" aria-label="Navegação principal">
          <a href="#produto">Produto</a>
          <a href="#para-quem">Para quem</a>
          <a href="#planos">Planos</a>
          <a href="#seguranca">Segurança</a>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <ButtonLink href="/entrar" variant="secondary" size="sm">
            Entrar
          </ButtonLink>
          <ButtonLink href="/entrar?demo=1" size="sm">
            Testar agora <ArrowRight size={15} />
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
