"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const schema = z.object({ email: z.email("Informe um e-mail válido.") });
type Input = z.infer<typeof schema>;

export function RecoveryForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input>({ resolver: zodResolver(schema) });
  async function onSubmit(values: Input) {
    if (isSupabaseConfigured()) await createClient().auth.resetPasswordForEmail(values.email, { redirectTo: `${window.location.origin}/nova-senha` });
    else await new Promise((resolve) => setTimeout(resolve, 450));
    setSent(true);
  }
  if (sent) return <div className="auth-card auth-success"><span className="auth-success__icon"><CheckCircle2 size={30} /></span><h2>Confira seu e-mail</h2><p>Se houver uma conta vinculada, enviaremos as instruções. Esta resposta não revela se o endereço está cadastrado.</p><Button type="button" onClick={() => setSent(false)}>Enviar para outro e-mail</Button><Link className="text-brand" href="/entrar">Voltar para entrar</Link></div>;
  return <div className="auth-card"><header className="auth-card__header"><span className="auth-success__icon"><Mail size={28} /></span><h2>Recupere seu acesso.</h2><p>Informe seu e-mail e enviaremos um link seguro, se a conta existir.</p></header><form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate><Field label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} /><Button type="submit" size="lg" busy={isSubmitting}>Enviar link de recuperação</Button></form><p className="auth-switch"><Link href="/entrar">Voltar para entrar</Link></p></div>;
}
