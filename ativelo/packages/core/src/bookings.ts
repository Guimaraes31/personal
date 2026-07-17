import { DomainRuleError } from "./errors";
import {
  cancelClassBookingInputSchema,
  classBookingSchema,
  classSessionSchema,
  reserveClassInputSchema,
} from "./schemas";
import type { ClassBooking, ClassSession } from "./types";
import { parseDomainInput } from "./validation";

export interface BookingMutationResult {
  booking: ClassBooking;
  bookings: ClassBooking[];
  waitlistPosition: number | null;
}

export interface BookingCancellationResult {
  cancelledBooking: ClassBooking;
  promotedBooking: ClassBooking | null;
  bookings: ClassBooking[];
}

function assertClassCanBeChanged(classSession: ClassSession, now: string): void {
  if (classSession.status !== "scheduled" || Date.parse(now) >= Date.parse(classSession.startsAt)) {
    throw new DomainRuleError(
      "CLASS_UNAVAILABLE",
      "Esta aula não está disponível para alterações.",
    );
  }
}

function isCapacityOccupying(booking: ClassBooking): boolean {
  return booking.status === "confirmed" || booking.status === "attended";
}

function isActiveBooking(booking: ClassBooking): boolean {
  return (
    booking.status === "confirmed" ||
    booking.status === "waitlisted" ||
    booking.status === "attended"
  );
}

function compareWaitlistOrder(left: ClassBooking, right: ClassBooking): number {
  const timeDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return timeDifference === 0 ? left.id.localeCompare(right.id) : timeDifference;
}

export function getClassAvailability(
  classSessionInput: ClassSession,
  bookingsInput: readonly ClassBooking[],
): { confirmed: number; waitlisted: number; availableSpots: number } {
  const classSession = parseDomainInput(classSessionSchema, classSessionInput);
  const bookings = bookingsInput
    .map((booking) => parseDomainInput(classBookingSchema, booking))
    .filter(
      (booking) =>
        booking.classSessionId === classSession.id &&
        booking.organizationId === classSession.organizationId,
    );

  const confirmed = bookings.filter(isCapacityOccupying).length;
  const waitlisted = bookings.filter((booking) => booking.status === "waitlisted").length;

  return {
    confirmed,
    waitlisted,
    availableSpots: Math.max(0, classSession.capacity - confirmed),
  };
}

export function reserveClass(
  classSessionInput: ClassSession,
  bookingsInput: readonly ClassBooking[],
  rawInput: unknown,
): BookingMutationResult {
  const classSession = parseDomainInput(classSessionSchema, classSessionInput);
  const bookings = bookingsInput.map((booking) =>
    parseDomainInput(classBookingSchema, booking),
  );
  const input = parseDomainInput(reserveClassInputSchema, rawInput);

  if (input.organizationId !== classSession.organizationId) {
    throw new DomainRuleError(
      "ORGANIZATION_MISMATCH",
      "A aula e o aluno devem pertencer à mesma organização.",
    );
  }

  assertClassCanBeChanged(classSession, input.now);

  if (bookings.some((booking) => booking.id === input.bookingId)) {
    throw new DomainRuleError("INVALID_INPUT", "O identificador da reserva já está em uso.");
  }

  const duplicate = bookings.some(
    (booking) =>
      booking.classSessionId === classSession.id &&
      booking.studentId === input.studentId &&
      isActiveBooking(booking),
  );

  if (duplicate) {
    throw new DomainRuleError("ALREADY_BOOKED", "O aluno já possui uma reserva ativa.");
  }

  const availability = getClassAvailability(classSession, bookings);
  const status = availability.availableSpots > 0 ? "confirmed" : "waitlisted";

  if (status === "waitlisted" && !classSession.waitlistEnabled) {
    throw new DomainRuleError("CLASS_FULL", "A aula está lotada.");
  }

  const booking: ClassBooking = {
    id: input.bookingId,
    organizationId: input.organizationId,
    classSessionId: classSession.id,
    studentId: input.studentId,
    status,
    createdAt: input.now,
    updatedAt: input.now,
  };

  const nextBookings = [...bookings, booking];
  const waitlistPosition =
    status === "waitlisted"
      ? nextBookings
          .filter(
            (candidate) =>
              candidate.classSessionId === classSession.id &&
              candidate.status === "waitlisted",
          )
          .sort(compareWaitlistOrder)
          .findIndex((candidate) => candidate.id === booking.id) + 1
      : null;

  return { booking, bookings: nextBookings, waitlistPosition };
}

export function cancelClassBooking(
  classSessionInput: ClassSession,
  bookingsInput: readonly ClassBooking[],
  rawInput: unknown,
): BookingCancellationResult {
  const classSession = parseDomainInput(classSessionSchema, classSessionInput);
  const bookings = bookingsInput.map((booking) =>
    parseDomainInput(classBookingSchema, booking),
  );
  const input = parseDomainInput(cancelClassBookingInputSchema, rawInput);

  if (input.organizationId !== classSession.organizationId) {
    throw new DomainRuleError(
      "ORGANIZATION_MISMATCH",
      "A reserva não pertence à organização informada.",
    );
  }

  assertClassCanBeChanged(classSession, input.now);

  const current = bookings.find((booking) => booking.id === input.bookingId);
  if (!current || current.classSessionId !== classSession.id) {
    throw new DomainRuleError("NOT_FOUND", "Reserva não encontrada.");
  }

  if (current.organizationId !== input.organizationId) {
    throw new DomainRuleError(
      "ORGANIZATION_MISMATCH",
      "A reserva não pertence à organização informada.",
    );
  }

  if (current.status !== "confirmed" && current.status !== "waitlisted") {
    throw new DomainRuleError(
      "BOOKING_NOT_CANCELLABLE",
      "Esta reserva não pode mais ser cancelada.",
    );
  }

  const cancelledBooking: ClassBooking = {
    ...current,
    status: "cancelled",
    updatedAt: input.now,
  };

  let promotedBooking: ClassBooking | null = null;
  if (current.status === "confirmed") {
    const firstWaitlisted = bookings
      .filter(
        (booking) =>
          booking.classSessionId === classSession.id && booking.status === "waitlisted",
      )
      .sort(compareWaitlistOrder)[0];

    if (firstWaitlisted) {
      promotedBooking = {
        ...firstWaitlisted,
        status: "confirmed",
        updatedAt: input.now,
      };
    }
  }

  const nextBookings = bookings.map((booking) => {
    if (booking.id === cancelledBooking.id) {
      return cancelledBooking;
    }
    if (promotedBooking && booking.id === promotedBooking.id) {
      return promotedBooking;
    }
    return booking;
  });

  return { cancelledBooking, promotedBooking, bookings: nextBookings };
}
