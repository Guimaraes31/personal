"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { writeDemoSession } from "@/lib/auth/session";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.email("Informe um e-mail válido."),
  goal: z.enum(["strength", "conditioning", "health", "mobility"]),
  password: z.string().min(8, "Use pelo menos 8 caracteres.").regex(/[A-Z]/, "Inclua uma letra maiúscula.").regex(/[0-9]/, "Inclua um número."),
  terms: z.literal(true, { error: "Aceite os termos para continuar." })
});
type Input = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input>({ resolver: zodResolver(schema), defaultValues: { goal: "strength", terms: false } });

  async function onSubmit(values: Input) {
    setFormError(undefined);
    if (isSupabaseConfigured()) {
      const { data, error } = await createClient().auth.signUp({ email: values.email, password: values.password, options: { data: { full_name: values.name, goal: values.goal, terms_accepted_at: new Date().toISOString() } } });
      if (error) { setFormError("Não foi possível criar sua conta. Tente novamente em instantes."); return; }
      if (!data.session) { router.push("/verificar-email"); return; }
    } else {
      writeDemoSession({ userId: `local_${crypto.randomUUID()}`, name: values.name, email: values.email, role: "student", organizationId: "org-horizonte", organizationName: "Academia Horizonte", demo: true, createdAt: new Date().toISOString() });
    }
    router.push("/app/inicio?welcome=1");
  }

  return (
    <div className="auth-card">
      <header className="auth-card__header"><h2>Comece pelo seu objetivo.</h2><p>Crie uma conta de aluno. Convites profissionais são enviados pela academia.</p></header>
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <div className="auth-error" role="alert"><AlertCircle size={18} /> {formError}</div>}
        <Field label="Nome completo" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <Field label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <SelectField label="Principal objetivo" error={errors.goal?.message} {...register("goal")}><option value="strength">Ganhar força</option><option value="conditioning">Melhorar condicionamento</option><option value="health">Cuidar da saúde</option><option value="mobility">Ganhar mobilidade</option></SelectField>
        <div className="password-wrap"><Field label="Senha" type={show ? "text" : "password"} autoComplete="new-password" hint="8+ caracteres, uma maiúscula e um número." error={errors.password?.message} {...register("password")} /><button type="button" className="password-toggle" onClick={() => setShow((value) => !value)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        <label className="checkbox-field"><input type="checkbox" {...register("terms")} /><span>Li e aceito os <Link className="text-brand" href="/termos">Termos</Link> e a <Link className="text-brand" href="/privacidade">Política de Privacidade</Link>. {errors.terms && <span className="field__error">{errors.terms.message}</span>}</span></label>
        <Button type="submit" size="lg" busy={isSubmitting}>Criar minha conta</Button>
      </form>
      <p className="auth-switch">Já tem uma conta? <Link href="/entrar">Entrar</Link></p>
    </div>
  );
}
