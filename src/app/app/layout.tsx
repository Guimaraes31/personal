import { AppShell } from "@/components/app/app-shell";
import { DemoFeedback } from "@/components/app/demo-feedback";
import { DemoStoreProvider } from "@/lib/demo-store";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoStoreProvider>
      <AppShell>{children}</AppShell>
      <DemoFeedback />
    </DemoStoreProvider>
  );
}
