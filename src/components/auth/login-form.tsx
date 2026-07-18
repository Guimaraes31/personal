"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, Eye, EyeOff, FlaskConical, GraduationCap, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { demoAccounts, sessionFor, type DemoAccount } from "@/lib/auth/demo-accounts";
import { writeDemoSession } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const loginSchema = z.object({ email: z.email("Informe um e-mail válido."), password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.") });
type LoginInput = z.infer<typeof loginSchema>;

const roleIcons = { student: UserRound, professional: GraduationCap, organization_admin: Building2, saas_admin: Shield };

export function LoginForm({ preferredDemo }: { preferredDemo?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  function enterDemo(account: DemoAccount) {
    writeDemoSession(sessionFor(account));
    router.push("/app/inicio");
  }

  async function onSubmit(values: LoginInput) {
    setFormError(undefined);
    const demo = Object.values(demoAccounts).find((account) => account.email === values.email.toLowerCase() && account.password === values.password);
    if (demo) return enterDemo(demo);

    if (!isSupabaseConfigured()) {
      setFormError("Credenciais não reconhecidas. Use um perfil da demonstração ou configure o Supabase.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setFormError("Não foi possível entrar. Confira e-mail e senha e tente novamente.");
      return;
    }
    router.push("/app/inicio");
    router.refresh();
  }

  const ordered = Object.values(demoAccounts).sort((a) => (a.role === preferredDemo ? -1 : 0));

  return (
    <div className="auth-card">
      <header className="auth-card__header"><h2>Que bom ter você aqui.</h2><p>Entre para continuar de onde parou.</p></header>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <div className="auth-error" role="alert"><AlertCircle size={18} /> {formError}</div>}
        <Field label="E-mail" type="email" autoComplete="email" placeholder="voce@empresa.com.br" error={errors.email?.message} {...register("email")} />
        <div className="password-wrap">
          <Field label="Senha" type={showPassword ? "text" : "password"} autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        <div className="auth-form__meta"><label className="checkbox-field"><input type="checkbox" defaultChecked /><span>Manter sessão</span></label><Link href="/recuperar-senha">Esqueci minha senha</Link></div>
        <Button type="submit" size="lg" busy={isSubmitting}>Entrar</Button>
      </form>
      <div className="auth-divider">ou entre na demonstração</div>
      <div className="demo-panel">
        <div className="demo-panel__head"><FlaskConical size={20} /><span><strong>Ambiente seguro com dados fictícios</strong><small>Escolha o ponto de vista que quer explorar.</small></span></div>
        <div className="demo-accounts">
          {ordered.map((account) => { const Icon = roleIcons[account.role]; return <button className="demo-account" type="button" key={account.role} onClick={() => enterDemo(account)}><span className="demo-account__avatar"><Icon size={18} /></span><span><strong>{account.label}</strong><small>{account.description}</small></span></button>; })}
        </div>
      </div>
      <p className="auth-switch">Ainda não tem acesso? <Link href="/cadastro">Criar conta de aluno</Link></p>
    </div>
  );
}
