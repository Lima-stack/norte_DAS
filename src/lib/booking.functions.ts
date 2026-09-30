import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createBooking, listAvailability } from "./booking.server";

export const getAvailability = createServerFn({ method: "GET" }).handler(async () => {
  return listAvailability();
});

const bookingSchema = z.object({
  start: z.string().datetime(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  notes: z.string().trim().max(500).optional(),
});

export const bookMeeting = createServerFn({ method: "POST" })
  .inputValidator((data) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await createBooking(data)) };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Não foi possível agendar.",
      };
    }
  });
