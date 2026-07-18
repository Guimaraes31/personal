"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.email("Informe um e-mail válido."),
  organization: z.string().trim().min(2, "Informe a academia ou empresa."),
  profile: z.enum(["personal", "academy", "network", "other"]),
  message: z.string().trim().min(10, "Conte um pouco mais em pelo menos 10 caracteres."),
  consent: z.literal(true, { error: "Você precisa aceitar o contato." })
});

type ContactInput = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { profile: "academy", consent: undefined as unknown as true }
  });

  async function onSubmit(values: ContactInput) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const contacts = JSON.parse(window.localStorage.getItem("ativelo:contacts") ?? "[]") as unknown[];
    contacts.push({ ...values, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    window.localStorage.setItem("ativelo:contacts", JSON.stringify(contacts));
    setSent(true);
    reset();
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {sent && (
        <div className="form-success" role="status">
          <CheckCircle2 size={20} />
          <span>
            Interesse registrado nesta demonstração. Em produção, este envio é conectado ao CRM e
            ao e-mail da equipe comercial.
          </span>
        </div>
      )}
      <div className="form-row">
        <Field label="Seu nome" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <Field
          label="E-mail profissional"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>
      <div className="form-row">
        <Field
          label="Academia ou empresa"
          autoComplete="organization"
          error={errors.organization?.message}
          {...register("organization")}
        />
        <SelectField label="Eu sou" error={errors.profile?.message} {...register("profile")}>
          <option value="personal">Personal trainer</option>
          <option value="academy">Gestor de academia</option>
          <option value="network">Gestor de rede</option>
          <option value="other">Outro perfil</option>
        </SelectField>
      </div>
      <TextareaField
        label="O que você quer melhorar hoje?"
        placeholder="Ex.: reduzir tarefas manuais e acompanhar a adesão dos alunos."
        error={errors.message?.message}
        {...register("message")}
      />
      <label className="checkbox-field">
        <input type="checkbox" {...register("consent")} />
        <span>
          Autorizo o contato da equipe Ativelo sobre esta solicitação. Posso retirar meu
          consentimento a qualquer momento. {errors.consent && <span className="field__error">{errors.consent.message}</span>}
        </span>
      </label>
      <Button type="submit" size="lg" busy={isSubmitting}>
        Registrar interesse <Send size={18} />
      </Button>
    </form>
  );
}
