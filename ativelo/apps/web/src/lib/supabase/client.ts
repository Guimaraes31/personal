import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url?.startsWith("https://") && key && !key.startsWith("your-"));
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !isSupabaseConfigured()) {
    throw new Error("Supabase não configurado. Use o modo demonstração ou defina as variáveis públicas.");
  }
  return createBrowserClient(url, key);
}
