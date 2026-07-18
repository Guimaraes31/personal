"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";
import { useDemoStore } from "@/lib/demo-store";

export function DemoFeedback() {
  const { error, message, clearFeedback } = useDemoStore();

  useEffect(() => {
    if (!error && !message) return;
    const timeout = window.setTimeout(clearFeedback, 5_000);
    return () => window.clearTimeout(timeout);
  }, [error, message, clearFeedback]);

  if (!error && !message) return null;
  const isError = Boolean(error);
  return (
    <div className="toast-region" aria-live={isError ? "assertive" : "polite"}>
      <div className={`toast toast--${isError ? "error" : "success"}`} role={isError ? "alert" : "status"}>
        {isError ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
        <span><strong>{isError ? "Não foi possível concluir" : "Tudo certo"}</strong><small>{error ?? message}</small></span>
        <button type="button" onClick={clearFeedback} aria-label="Fechar mensagem"><X size={16} /></button>
      </div>
    </div>
  );
}
