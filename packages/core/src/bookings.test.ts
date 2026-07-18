import { describe, expect, it } from "vitest";

import { cancelClassBooking, reserveClass } from "./bookings";
import type { ClassSession } from "./types";

const classSession: ClassSession = {
  id: "class-test",
  organizationId: "org-a",
  title: "Treino coletivo",
  professionalId: "professional-a",
  startsAt: "2026-07-20T14:00:00.000Z",
  endsAt: "2026-07-20T15:00:00.000Z",
  capacity: 1,
  waitlistEnabled: true,
  status: "scheduled",
};

describe("reservas de aula", () => {
  it("confirma até a capacidade e coloca os próximos na lista de espera", () => {
    const first = reserveClass(classSession, [], {
      bookingId: "booking-a",
      organizationId: "org-a",
      studentId: "student-a",
      now: "2026-07-17T10:00:00.000Z",
    });
    const second = reserveClass(classSession, first.bookings, {
      bookingId: "booking-b",
      organizationId: "org-a",
      studentId: "student-b",
      now: "2026-07-17T10:01:00.000Z",
    });

    expect(first.booking.status).toBe("confirmed");
    expect(second.booking.status).toBe("waitlisted");
    expect(second.waitlistPosition).toBe(1);
    expect(first.bookings).toHaveLength(1);
  });

  it("promove a primeira pessoa da fila quando uma vaga é cancelada", () => {
    const confirmed = reserveClass(classSession, [], {
      bookingId: "booking-a",
      organizationId: "org-a",
      studentId: "student-a",
      now: "2026-07-17T10:00:00.000Z",
    });
    const waitlisted = reserveClass(classSession, confirmed.bookings, {
      bookingId: "booking-b",
      organizationId: "org-a",
      studentId: "student-b",
      now: "2026-07-17T10:01:00.000Z",
    });
    const result = cancelClassBooking(classSession, waitlisted.bookings, {
      bookingId: "booking-a",
      organizationId: "org-a",
      now: "2026-07-17T11:00:00.000Z",
    });

    expect(result.cancelledBooking.status).toBe("cancelled");
    expect(result.promotedBooking).toMatchObject({
      id: "booking-b",
      status: "confirmed",
    });
    expect(
      result.bookings.filter((booking) => booking.status === "confirmed"),
    ).toHaveLength(1);
  });

  it("rejeita reserva cruzada entre organizações", () => {
    expect(() =>
      reserveClass(classSession, [], {
        bookingId: "booking-cross-tenant",
        organizationId: "org-b",
        studentId: "student-b",
        now: "2026-07-17T10:00:00.000Z",
      }),
    ).toThrowError(expect.objectContaining({ code: "ORGANIZATION_MISMATCH" }));
  });

  it("não aceita duas reservas ativas para o mesmo aluno", () => {
    const first = reserveClass(classSession, [], {
      bookingId: "booking-a",
      organizationId: "org-a",
      studentId: "student-a",
      now: "2026-07-17T10:00:00.000Z",
    });

    expect(() =>
      reserveClass(classSession, first.bookings, {
        bookingId: "booking-duplicate",
        organizationId: "org-a",
        studentId: "student-a",
        now: "2026-07-17T10:01:00.000Z",
      }),
    ).toThrowError(expect.objectContaining({ code: "ALREADY_BOOKED" }));
  });
});
