import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false, follow: false } };

export default function SignupPage() { return <AuthShell title="Seu progresso começa com um elo."><SignupForm /></AuthShell>; }
