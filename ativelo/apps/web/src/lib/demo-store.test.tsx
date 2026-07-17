import { act, renderHook, waitFor } from "@testing-library/react";
import { createDemoData } from "@ativelo/core";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { demoAccounts, sessionFor } from "@/lib/auth/demo-accounts";
import { clearDemoSession, writeDemoSession } from "@/lib/auth/session";

import { DemoStoreProvider, useDemoStore } from "./demo-store";

function wrapper({ children }: { children: ReactNode }) {
  return <DemoStoreProvider>{children}</DemoStoreProvider>;
}

describe("DemoStoreProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    clearDemoSession();
    window.localStorage.clear();
  });

  it("expõe ao aluno somente dados permitidos da organização ativa", async () => {
    writeDemoSession(sessionFor(demoAccounts.student));
    const { result } = renderHook(() => useDemoStore(), { wrapper });

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(result.current.data.organizations.map((item) => item.id)).toEqual([
      "org-horizonte",
    ]);
    expect(result.current.data.users.some((item) => item.id === "user-aluno-davi")).toBe(
      false,
    );
    expect(
      result.current.data.bodyMeasurements.every(
        (item) => item.studentId === demoAccounts.student.userId,
      ),
    ).toBe(true);
    expect(result.current.data.subscriptions).toHaveLength(0);
  });

  it("recupera e conclui a sessão em andamento com mutações imutáveis", async () => {
    writeDemoSession(sessionFor(demoAccounts.student));
    const { result } = renderHook(() => useDemoStore(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const active = result.current.data.workoutSessions.find(
      (item) => item.status === "in_progress",
    );
    expect(active).toBeDefined();

    for (const set of active!.sets.filter((item) => item.status === "pending")) {
      act(() => {
        const response = result.current.recordWorkoutSet({
          sessionId: active!.id,
          setId: set.id,
          repetitions: set.targetRepetitions,
          load: 20,
          now: "2026-07-17T12:05:00.000Z",
        });
        expect(response.ok).toBe(true);
      });
    }

    act(() => {
      const response = result.current.completeWorkoutSession({
        sessionId: active!.id,
        perceivedEffort: 7,
        feedback: "Bom treino",
        now: "2026-07-17T12:20:00.000Z",
      });
      expect(response.ok).toBe(true);
    });

    expect(
      result.current.data.workoutSessions.find((item) => item.id === active!.id)?.status,
    ).toBe("completed");
  });

  it("cancela a vaga do aluno e promove a lista de espera", async () => {
    writeDemoSession(sessionFor(demoAccounts.student));
    const { result } = renderHook(() => useDemoStore(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      const response = result.current.cancelClassBooking({
        bookingId: "booking-functional-lia",
        now: "2026-07-17T13:00:00.000Z",
      });
      expect(response.ok).toBe(true);
    });

    expect(result.current.getClassAvailability("class-horizonte-functional")).toEqual({
      confirmed: 1,
      waitlisted: 0,
      availableSpots: 0,
    });
  });

  it("nega mutações administrativas a uma sessão de aluno", async () => {
    writeDemoSession(sessionFor(demoAccounts.student));
    const { result } = renderHook(() => useDemoStore(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      const response = result.current.updateOrganization({
        organizationId: "org-horizonte",
        name: "Nome indevido",
      });
      expect(response).toEqual({
        ok: false,
        error: "Você não tem permissão para realizar esta ação.",
      });
    });

    expect(result.current.data.organizations[0]?.name).toBe("Academia Horizonte");
  });

  it("persiste e reidrata mutações válidas entre montagens", async () => {
    writeDemoSession(sessionFor(demoAccounts.student));
    const first = renderHook(() => useDemoStore(), { wrapper });
    await waitFor(() => expect(first.result.current.isHydrated).toBe(true));

    act(() => {
      first.result.current.cancelClassBooking({
        bookingId: "booking-functional-lia",
        now: "2026-07-17T13:00:00.000Z",
      });
    });
    await waitFor(() =>
      expect(window.localStorage.getItem("ativelo:demo-store:v2")).toContain(
        '"status":"cancelled"',
      ),
    );
    first.unmount();

    const second = renderHook(() => useDemoStore(), { wrapper });
    await waitFor(() => expect(second.result.current.isHydrated).toBe(true));
    expect(
      second.result.current.data.classBookings.find(
        (item) => item.id === "booking-functional-lia",
      )?.status,
    ).toBe("cancelled");
  });

  it("rejeita snapshots adulterados com identificadores duplicados", async () => {
    const corrupted = createDemoData();
    corrupted.classSessions.push({ ...corrupted.classSessions[0]! });
    window.localStorage.setItem(
      "ativelo:demo-store:v2",
      JSON.stringify({ version: 2, data: corrupted }),
    );
    writeDemoSession(sessionFor(demoAccounts.student));

    const { result } = renderHook(() => useDemoStore(), { wrapper });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(result.current.error).toBe(
      "O armazenamento local não estava disponível ou era inválido; a demo foi restaurada em memória.",
    );
    expect(result.current.data.classSessions).toHaveLength(2);
  });
});
