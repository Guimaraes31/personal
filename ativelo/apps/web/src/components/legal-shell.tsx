import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";

export function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="legal-header">
        <div className="container legal-header__inner">
          <Logo />
          <div className="header-actions">
            <ThemeToggle />
            <ButtonLink href="/" variant="secondary" size="sm"><ArrowLeft size={15} /> Voltar</ButtonLink>
          </div>
        </div>
      </header>
      <main id="conteudo" className="legal-page">
        <div className="narrow-container">{children}</div>
      </main>
    </>
  );
}
