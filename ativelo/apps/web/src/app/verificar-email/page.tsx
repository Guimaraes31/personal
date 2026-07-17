import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verifique seu e-mail", robots: { index: false, follow: false } };
export default function VerifyEmailPage() { return <AuthShell><div className="auth-card auth-success"><span className="auth-success__icon"><CheckCircle2 size={30} /></span><h2>Confirme seu e-mail</h2><p>Enviamos um link de verificação. Abra-o no mesmo dispositivo para concluir seu cadastro.</p><ButtonLink href="/entrar">Voltar para entrar</ButtonLink></div></AuthShell>; }
