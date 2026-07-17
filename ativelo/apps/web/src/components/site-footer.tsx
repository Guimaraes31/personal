import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>
              Treino conectado. Evolução visível. Uma operação mais simples para quem move pessoas
              todos os dias.
            </p>
          </div>
          <div className="footer-column">
            <h3>Produto</h3>
            <a href="#produto">Funcionalidades</a>
            <a href="#planos">Planos</a>
            <a href="/entrar?demo=1">Demonstração</a>
          </div>
          <div className="footer-column">
            <h3>Empresa</h3>
            <a href="#contato">Contato</a>
            <a href="#seguranca">Segurança</a>
            <a href="/status">Status</a>
          </div>
          <div className="footer-column">
            <h3>Legal</h3>
            <a href="/privacidade">Privacidade</a>
            <a href="/termos">Termos de uso</a>
            <a href="/acessibilidade">Acessibilidade</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Ativelo. Produto demonstrativo original.</span>
          <span>Feito para movimento, com privacidade desde a concepção.</span>
        </div>
      </div>
    </footer>
  );
}
